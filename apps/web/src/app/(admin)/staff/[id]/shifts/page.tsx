import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { WeeklyScheduleEditor } from '@/components/weekly-schedule-editor';
import { ExceptionsSection } from './exceptions-section';
import { TimeOffSection, type TimeOffEntry } from './time-off-section';

type ExceptionMap = Record<
  string,
  { closed: true } | { intervals: Array<{ open: string; close: string }> }
>;

function normalizeExceptions(raw: unknown): ExceptionMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: ExceptionMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (!v || typeof v !== 'object') continue;
    const obj = v as Record<string, unknown>;
    if (obj.closed === true) {
      out[k] = { closed: true };
    } else if (Array.isArray(obj.intervals)) {
      const arr = obj.intervals.filter(
        (x): x is { open: string; close: string } =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as { open?: unknown }).open === 'string' &&
          typeof (x as { close?: unknown }).close === 'string',
      );
      if (arr.length > 0) out[k] = { intervals: arr };
    }
  }
  return out;
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Interval = { open: string; close: string };
type Schedule = Record<DayKey, Interval[]>;

const EMPTY_SCHEDULE: Schedule = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

function normalizeSchedule(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: Schedule = { ...EMPTY_SCHEDULE };
  let hasAny = false;
  for (const key of Object.keys(EMPTY_SCHEDULE) as DayKey[]) {
    const v = r[key];
    if (Array.isArray(v)) {
      const arr = v.filter(
        (x): x is Interval =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as Interval).open === 'string' &&
          typeof (x as Interval).close === 'string',
      );
      out[key] = arr;
      if (arr.length > 0) hasAny = true;
    }
  }
  return hasAny ? out : EMPTY_SCHEDULE;
}

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
  weeklySchedule: unknown;
  scheduleExceptions: unknown;
}

async function load(staffId: string): Promise<{
  staff: StaffRow | null;
  timeOff: TimeOffEntry[];
}> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  try {
    const [staff, timeOff] = await Promise.all([
      apiFetch<StaffRow>(`/v1/staff/${staffId}`, auth),
      apiFetch<{ entries: TimeOffEntry[] }>(`/v1/staff/${staffId}/time-off`, auth),
    ]);
    return { staff, timeOff: timeOff.entries };
  } catch (err) {
    if (err instanceof ApiError) return { staff: null, timeOff: [] };
    throw err;
  }
}

export default async function StaffShiftsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const { staff, timeOff } = await load(id);
  if (!staff) notFound();

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Link
        href="/staff"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Team
      </Link>

      <header className="mb-8 mt-4 flex items-center gap-4">
        <Avatar name={`${staff.firstName} ${staff.lastName}`} color={staff.color} size="lg" />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Arbeitszeiten
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {staff.firstName} {staff.lastName}
          </h1>
        </div>
      </header>

      <WeeklyScheduleEditor staffId={id} initial={normalizeSchedule(staff.weeklySchedule)} />

      <ExceptionsSection
        staffId={id}
        initialExceptions={normalizeExceptions(staff.scheduleExceptions)}
      />

      <TimeOffSection staffId={id} initialEntries={timeOff} />
    </div>
  );
}
