/**
 * Recurring-Pattern-Detector — Pure-Function-Algorithmus.
 *
 * Findet in einer Liste von Termin-Daten wiederkehrende Muster:
 * - Gleicher Service
 * - Gleicher Wochentag + ähnliche Tageszeit (±60 Min)
 * - Konstante Intervalle (mit Toleranz)
 *
 * Liefert Pattern mit Confidence-Score zurück. Score > 0.7 = "Sehr wahrscheinlich
 * Stamm-Kundin". Wird auf Client-Detail-Seite als "💡 Serie vorschlagen" exposed.
 */

export interface AppointmentForPattern {
  startAt: Date;
  durationMinutes: number;
  staffId: string;
  serviceId: string;
}

export interface DetectedPattern {
  serviceId: string;
  staffId: string;
  intervalWeeks: number; // 2/3/4/6/8 — gerundet
  weekday: number; // 0-6 (sun-sat)
  hourOfDay: number; // 0-23
  minuteOfHour: number; // 0-59
  durationMinutes: number;
  matchCount: number; // wie viele Termine matchen
  confidence: number; // 0-1
  /** Ist Pattern noch "frisch"? letzte Occurrence < 16 Wochen alt */
  recent: boolean;
  /** Vorgeschlagener nächster Termin basierend auf letztem + Intervall */
  nextSuggestedAt: Date;
}

const INTERVAL_BUCKETS = [2, 3, 4, 6, 8]; // Wochen
const MAX_INTERVAL_DEVIATION_DAYS = 4; // ±4 Tage Toleranz pro Intervall
const MAX_TIME_DEVIATION_MIN = 60;

/**
 * Hauptfunktion: nimm alle abgeschlossenen Termine einer Kundin,
 * gib das stärkste Pattern zurück (oder null).
 */
export function detectPattern(appointments: AppointmentForPattern[]): DetectedPattern | null {
  if (appointments.length < 3) return null;

  // Sortier-by-Datum
  const sorted = [...appointments].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  // Gruppiere nach (serviceId, staffId)
  const groups = new Map<string, AppointmentForPattern[]>();
  for (const a of sorted) {
    const key = `${a.serviceId}|${a.staffId}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  let best: DetectedPattern | null = null;
  for (const [key, group] of groups) {
    if (group.length < 3) continue;
    const candidate = analyzeGroup(group, key);
    if (!candidate) continue;
    if (!best || candidate.confidence > best.confidence) best = candidate;
  }
  return best;
}

function analyzeGroup(group: AppointmentForPattern[], key: string): DetectedPattern | null {
  const [serviceId, staffId] = key.split('|');
  if (!serviceId || !staffId) return null;

  // Intervalle zwischen aufeinanderfolgenden Terminen (in Tagen)
  const intervalsDays: number[] = [];
  for (let i = 1; i < group.length; i++) {
    const prev = group[i - 1]!.startAt.getTime();
    const curr = group[i]!.startAt.getTime();
    const days = (curr - prev) / (1000 * 60 * 60 * 24);
    intervalsDays.push(days);
  }

  // Bucket-Match: für jedes Bucket (in Wochen) zähle wie viele Intervalle passen
  let bestBucket = 0;
  let bestMatchCount = 0;
  for (const weeks of INTERVAL_BUCKETS) {
    const targetDays = weeks * 7;
    const matches = intervalsDays.filter(
      (d) => Math.abs(d - targetDays) <= MAX_INTERVAL_DEVIATION_DAYS,
    ).length;
    if (matches > bestMatchCount) {
      bestMatchCount = matches;
      bestBucket = weeks;
    }
  }

  if (bestBucket === 0 || bestMatchCount < 2) return null; // mindestens 2 passende Intervalle = 3 Termine

  // Wochentag + Tageszeit-Konsistenz prüfen
  const weekdays = group.map((a) => a.startAt.getDay());
  const dominantWeekday = mode(weekdays);
  const weekdayMatchCount = weekdays.filter((w) => w === dominantWeekday).length;

  const minutes = group.map((a) => a.startAt.getHours() * 60 + a.startAt.getMinutes());
  const dominantMinute = Math.round(median(minutes));
  const timeMatches = minutes.filter(
    (m) => Math.abs(m - dominantMinute) <= MAX_TIME_DEVIATION_MIN,
  ).length;

  // Confidence-Formula: gewichteter Score 0..1
  const intervalScore = bestMatchCount / Math.max(intervalsDays.length, 1);
  const weekdayScore = weekdayMatchCount / group.length;
  const timeScore = timeMatches / group.length;
  const sampleScore = Math.min(group.length / 5, 1); // mehr Termine = mehr Vertrauen
  const confidence =
    intervalScore * 0.4 + weekdayScore * 0.25 + timeScore * 0.2 + sampleScore * 0.15;

  if (confidence < 0.5) return null;

  // Letzter Termin + Intervall = nächster Vorschlag
  const lastAppt = group[group.length - 1]!;
  const nextSuggestedAt = new Date(
    lastAppt.startAt.getTime() + bestBucket * 7 * 24 * 60 * 60 * 1000,
  );

  // Recent = letzter Termin innerhalb 16 Wochen
  const sixteenWeeksAgo = Date.now() - 16 * 7 * 24 * 60 * 60 * 1000;
  const recent = lastAppt.startAt.getTime() > sixteenWeeksAgo;

  return {
    serviceId,
    staffId,
    intervalWeeks: bestBucket,
    weekday: dominantWeekday,
    hourOfDay: Math.floor(dominantMinute / 60),
    minuteOfHour: dominantMinute % 60,
    durationMinutes: lastAppt.durationMinutes,
    matchCount: group.length,
    confidence: Math.round(confidence * 100) / 100,
    recent,
    nextSuggestedAt,
  };
}

function mode(arr: number[]): number {
  const counts = new Map<number, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = arr[0]!;
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
