import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { deleteStaff } from './actions';

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  role: string;
  employmentType: string;
  color: string | null;
  active: boolean;
}

async function loadStaff(): Promise<StaffRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ staff: StaffRow[] }>('/v1/staff', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.staff;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

const roleLabels: Record<string, string> = {
  OWNER: 'Inhaberin',
  MANAGER: 'Managerin',
  FRONT_DESK: 'Empfang',
  STYLIST: 'Stylistin',
  BOOTH_RENTER: 'Mieterin',
  TRAINEE: 'Auszubildende',
  ASSISTANT: 'Assistentin',
};

export default async function StaffPage(): Promise<React.JSX.Element> {
  const staff = await loadStaff();

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Team
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mitarbeiterinnen</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {staff.length} aktive Teammitglieder
          </p>
        </div>
        <Link
          href="/staff/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Neue Mitarbeiterin
        </Link>
      </header>

      {staff.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 p-10 text-center">
          <p className="text-sm text-neutral-500">Keine Mitarbeiterinnen angelegt.</p>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => {
            const name = s.displayName ?? `${s.firstName} ${s.lastName}`;
            const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
            return (
              <article
                key={s.id}
                className="rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: s.color ?? '#737373' }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-neutral-500">
                      {roleLabels[s.role] ?? s.role}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-neutral-500">
                  <div>{s.email}</div>
                  {s.phone ? <div>{s.phone}</div> : null}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    href={`/staff/${s.id}/shifts`}
                    className="text-xs text-neutral-600 hover:underline"
                  >
                    Arbeitszeiten →
                  </Link>
                  {s.role !== 'OWNER' ? (
                    <form action={deleteStaff.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Entfernen
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
