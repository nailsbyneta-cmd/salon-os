import Link from 'next/link';
import { Avatar, Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
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
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Team
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Mitarbeiterinnen
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {staff.length} aktive Teammitglieder
          </p>
        </div>
        <Link href="/staff/new">
          <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
            Neue Mitarbeiterin
          </Button>
        </Link>
      </header>

      {staff.length === 0 ? (
        <Card>
          <EmptyState
            title="Keine Mitarbeiterinnen"
            description="Füge die erste Stylistin hinzu, damit Termine vergeben werden können."
            action={
              <Link href="/staff/new">
                <Button variant="accent">+ Mitarbeiterin anlegen</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => {
            const name = s.displayName ?? `${s.firstName} ${s.lastName}`;
            return (
              <Card key={s.id} elevation="hoverable">
                <CardBody>
                  <Link
                    href={`/staff/${s.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={name} color={s.color} size="lg" />
                      <div>
                        <div className="font-medium text-text-primary hover:text-accent">
                          {name}
                        </div>
                        <Badge tone={s.role === 'OWNER' ? 'accent' : 'neutral'}>
                          {roleLabels[s.role] ?? s.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-text-muted">
                      <div>{s.email}</div>
                      {s.phone ? <div>{s.phone}</div> : null}
                    </div>
                  </Link>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <Link
                      href={`/staff/${s.id}/shifts`}
                      className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
                    >
                      Arbeitszeiten →
                    </Link>
                    {s.role !== 'OWNER' ? (
                      <form action={deleteStaff.bind(null, s.id)}>
                        <button
                          type="submit"
                          className="text-xs text-danger hover:underline"
                        >
                          Entfernen
                        </button>
                      </form>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
