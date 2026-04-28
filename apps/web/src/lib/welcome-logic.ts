/**
 * HeroWelcome Priority-Waterfall (pure, testbar, SSR-safe).
 *
 * Berechnet aus dem Kontext der Kundin (bekannt/unbekannt + Buchungs-
 * Historie + Tageszeit + Saison + Wetter) eine personalisierte
 * Begrüssungszeile — eine einzige, höchste-Priorität-zuerst.
 *
 * Design-Prinzip (UX-Brief): subtile Personalisierung wie ein
 * aufmerksamer Empfang an der Rezeption. Niemals aufdringlich, niemals
 * Discount-Push, niemals "X Termine frei" (Memory-Regel: keine leere
 * Kapazität öffentlich).
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherCondition = 'sunny' | 'rainy' | 'cloudy' | 'hot' | 'cold';

export interface WelcomeCustomer {
  firstName: string;
  /** ISO date des letzten Termins. */
  lastVisitDate?: string;
  lastService?: string;
  /** Service-Kategorien die schon mal gebucht wurden (für Cross-Sell). */
  bookingHistory?: string[];
  totalVisits?: number;
}

export interface WelcomeContext {
  customer?: WelcomeCustomer;
  tenant: {
    name: string;
    city?: string;
    /** Verfügbare Service-Kategorien (lowercase keywords) für Cross-Sell-Match. */
    serviceCategories: string[];
  };
  /** 0–23, lokale Stunde der Kundin. */
  currentHour: number;
  weather?: {
    condition: WeatherCondition;
    tempC?: number;
  };
  isWeekend: boolean;
  season: Season;
  /** Day-of-Year 1–366 — für deterministische Zitat-Rotation. */
  dayOfYear: number;
}

export interface WelcomeMessage {
  text: string;
  /** Optionaler Vorname-Slice für ein Highlight-Span im Render. */
  highlightName?: string;
  source:
    | 'time'
    | 'returning'
    | 'long-absent'
    | 'cross-sell'
    | 'weather'
    | 'season'
    | 'weekend'
    | 'quote';
}

const QUOTES: readonly string[] = [
  'Schönheit beginnt dort, wo du dich entscheidest, du selbst zu sein.',
  'Ein Termin ist nicht Luxus. Es ist Selbstfürsorge.',
  'Das Schönste, das du tragen kannst, ist dein Selbstvertrauen.',
  'Verwöhnen ist keine Schwäche — es ist Weisheit.',
  'Manchmal ist der beste Schritt nach vorne ein Moment für dich.',
  'Schönheit ist keine Perfektion. Sie ist ein Gefühl.',
  'Du verdienst es, dich so zu fühlen, wie du in deinen besten Momenten aussiehst.',
  'Eleganz ist die einzige Schönheit, die niemals verblasst.',
  'Gib dir selbst, was du jedem anderen gibst — Aufmerksamkeit.',
  'Dein Wohlbefinden ist keine Ausgabe. Es ist eine Investition.',
];

/** Mapping: Service-Kategorie-Keyword → Cross-Sell-Satz. Lowercase-Match. */
const CROSS_SELL_LINES: ReadonlyArray<{ matchAny: string[]; text: string }> = [
  {
    matchAny: ['pediküre', 'pedikuere', 'pedicure', 'fusspflege'],
    text: 'Deine Nägel würden sich über etwas Zuwendung freuen. 💅',
  },
  {
    matchAny: ['balayage'],
    text: 'Hast du schon einmal Balayage ausprobiert? Es könnte dein neues Lieblingsritual werden.',
  },
  {
    matchAny: ['lashes', 'wimpern'],
    text: 'Stell dir vor, morgens aufzuwachen und schon perfekte Wimpern zu haben.',
  },
  {
    matchAny: ['massage'],
    text: 'Manchmal braucht man einfach eine Stunde nur für sich. Gönn es dir.',
  },
  {
    matchAny: ['hydrafacial', 'gesicht', 'facial'],
    text: 'Eine Stunde Strahlen für dein Gesicht — du wirst dich verlieben.',
  },
];

const DAYS_RECENTLY_RETURN_MIN = 28;
const DAYS_RECENTLY_RETURN_MAX = 60;
const DAYS_LONG_ABSENT = 60;

export function selectWelcomeMessage(ctx: WelcomeContext): WelcomeMessage | null {
  // PRIO 1+2 — Bekannte Kundin
  if (ctx.customer?.firstName) {
    const longAbsent = isLongAbsent(ctx.customer.lastVisitDate);
    if (longAbsent === 'long') {
      return {
        text: `Du warst lange nicht mehr hier, ${ctx.customer.firstName} — schön, dich wiederzusehen.`,
        highlightName: ctx.customer.firstName,
        source: 'long-absent',
      };
    }
    if (longAbsent === 'medium') {
      return {
        text: `Willkommen zurück, ${ctx.customer.firstName}.`,
        highlightName: ctx.customer.firstName,
        source: 'returning',
      };
    }
    // Tageszeit-Greeting
    const greeting = greetByHour(ctx.currentHour, ctx.customer.firstName);
    if (greeting) return greeting;
  }

  // PRIO 3 — Cross-Sell für bekannte Kundin
  if (ctx.customer?.bookingHistory && ctx.tenant.serviceCategories.length > 0) {
    const cs = pickCrossSell(ctx.customer.bookingHistory, ctx.tenant.serviceCategories);
    if (cs) return { text: cs, source: 'cross-sell' };
  }

  // PRIO 4 — Wetter
  if (ctx.weather) {
    const w = weatherLine(ctx.weather);
    if (w) return { text: w, source: 'weather' };
  }

  // PRIO 5 — Wochenende oder Saison
  if (ctx.isWeekend) {
    return { text: 'Das Wochenende gehört dir — fang es richtig an.', source: 'weekend' };
  }
  return { text: seasonLine(ctx.season, ctx.dayOfYear), source: 'season' };
}

// ─── Helper-Funktionen (alle pure, testbar) ─────────────────────

export function isLongAbsent(lastVisitIso?: string): 'long' | 'medium' | 'recent' | null {
  if (!lastVisitIso) return null;
  const lastMs = Date.parse(lastVisitIso);
  if (!Number.isFinite(lastMs)) return null;
  const days = Math.floor((Date.now() - lastMs) / (24 * 60 * 60 * 1000));
  if (days > DAYS_LONG_ABSENT) return 'long';
  if (days >= DAYS_RECENTLY_RETURN_MIN && days <= DAYS_RECENTLY_RETURN_MAX) return 'medium';
  return 'recent';
}

function greetByHour(hour: number, firstName: string): WelcomeMessage | null {
  if (hour >= 5 && hour < 12) {
    return {
      text: `Guten Morgen, ${firstName}. ☀️`,
      highlightName: firstName,
      source: 'time',
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      text: `Schön, dass du wieder da bist, ${firstName}.`,
      highlightName: firstName,
      source: 'time',
    };
  }
  if (hour >= 18 && hour < 24) {
    return {
      text: `Einen schönen Abend, ${firstName}. ✨`,
      highlightName: firstName,
      source: 'time',
    };
  }
  return null; // 0–4 Uhr: kein passendes Greeting (Saison-Fallback)
}

export function pickCrossSell(history: string[], available: string[]): string | null {
  // Lowercase-Match: history und available werden lowercase-verglichen
  const haveLower = new Set(history.map((s) => s.toLowerCase().trim()));
  const availLower = available.map((s) => s.toLowerCase().trim());
  for (const line of CROSS_SELL_LINES) {
    // Service ist im Salon verfügbar
    const isOffered = line.matchAny.some((kw) => availLower.some((a) => a.includes(kw)));
    if (!isOffered) continue;
    // Kundin hat noch NIE in dieser Kategorie gebucht
    const alreadyBooked = line.matchAny.some((kw) =>
      Array.from(haveLower).some((h) => h.includes(kw)),
    );
    if (alreadyBooked) continue;
    return line.text;
  }
  return null;
}

function weatherLine(weather: NonNullable<WelcomeContext['weather']>): string | null {
  const t = weather.tempC;
  if (typeof t === 'number' && t >= 28) {
    return 'Bei dieser Hitze ist ein verwöhnender Moment bei uns genau das Richtige.';
  }
  if (typeof t === 'number' && t < 5) {
    return 'Kalt draussen — perfekte Ausrede, sich heute etwas Gutes zu tun. 🌿';
  }
  if (weather.condition === 'rainy') {
    return 'Draussen grau? Innen golden. Der perfekte Tag für eine Behandlung.';
  }
  return null;
}

function seasonLine(season: Season, dayOfYear: number): string {
  switch (season) {
    case 'spring':
      return 'Der Frühling ist da — und deine Nägel wollen das auch feiern. 🌸';
    case 'summer':
      return 'Sommergefühl beginnt manchmal mit einem Termin. ☀️';
    case 'autumn':
      return 'Herbst ist die beste Jahreszeit für ein neues Ritual.';
    case 'winter':
      return 'Der schönste Luxus im Winter: eine Stunde ganz für dich.';
    default: {
      // Defensive — sollte unreachable sein
      const idx = ((dayOfYear % QUOTES.length) + QUOTES.length) % QUOTES.length;
      return QUOTES[idx]!;
    }
  }
}

export function quoteOfTheDay(dayOfYear: number): string {
  const idx = ((dayOfYear % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[idx]!;
}

export function getSeason(month1to12: number): Season {
  if (month1to12 >= 3 && month1to12 <= 5) return 'spring';
  if (month1to12 >= 6 && month1to12 <= 8) return 'summer';
  if (month1to12 >= 9 && month1to12 <= 11) return 'autumn';
  return 'winter';
}

export function getDayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}
