import Link from 'next/link';
import { Badge, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { cancelMembership, togglePlan } from './actions';
import { PlanForm } from './plan-form';

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
type MembershipStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  priceChf: string | number;
  billingCycle: BillingCycle;
  sessionCredits: number | null;
  discountPct: number | null;
  active: boolean;
  createdAt: string;
}

interface ClientMembership {
  id: string;
  clientId: string;
  planId: string;
  status: MembershipStatus;
  startedAt: string;
  nextBillingAt: string | null;
  cancelledAt: string | null;
  creditsUsed: number;
  plan: MembershipPlan;
  client: { id: string; firstName: string; lastName: string };
}

const cycleLabel: Record<BillingCycle, string> = {
  MONTHLY: 'Monatlich',
  QUARTERLY: 'Vierteljährlich',
  ANNUAL: 'Jährlich',
};

const cycleTone: Record<BillingCycle, 'neutral' | 'info' | 'accent'> = {
  MONTHLY: 'neutral',
  QUARTERLY: 'info',
  ANNUAL: 'accent',
};

const statusTone: Record<MembershipStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

const statusLabel: Record<MembershipStatus, string> = {
  ACTIVE: 'Aktiv',
  PAUSED: 'Pausiert',
  CANCELLED: 'Gekündigt',
  EXPIRED: 'Abgelaufen',
};

async function loadData(): Promise<{
  plans: MembershipPlan[];
  memberships: ClientMembership[];
}> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      if (err instanceof ApiError) return fallback;
      throw err;
    }
  };
  const [plansRes, membershipsRes] = await Promise.all([
    safe(apiFetch<{ plans: MembershipPlan[] }>('/v1/memberships/plans', auth), { plans: [] }),
    safe(apiFetch<{ memberships: ClientMembership[] }>('/v1/memberships/active', auth), {
      memberships: [],
    }),
  ]);
  return { plans: plansRes.plans, memberships: membershipsRes.memberships };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function MembershipsSettingsPage(): Promise<React.JSX.Element> {
  const { plans, memberships } = await loadData();

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        Zuruck zu Einstellungen
      </Link>

      <header className="mt-3 mb-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Einstellungen
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Mitgliedschaften
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Verwalte Mitgliedschafts-Plane und weise Kundinnen Abonnements zu. Abrechnung erfolgt
          manuell — das System verfolgt Zyklen und Credits.
        </p>
      </header>

      {/* ─── Plans Section ─── */}
      <section className="mb-12">
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Mitgliedschafts-Plane
        </h2>

        {plans.length === 0 ? (
          <Card className="mb-4">
            <CardBody className="py-8 text-center text-sm text-text-muted">
              Noch keine Plane angelegt. Erstelle unten den ersten Plan.
            </CardBody>
          </Card>
        ) : (
          <Card className="mb-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-raised/40">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Preis
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Zyklus
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Credits
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Rabatt
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-surface-raised/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{plan.name}</div>
                        {plan.description ? (
                          <div className="text-xs text-text-muted truncate max-w-[200px]">
                            {plan.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">
                        {Number(plan.priceChf).toLocaleString('de-CH', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        CHF
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={cycleTone[plan.billingCycle]}>
                          {cycleLabel[plan.billingCycle]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {plan.sessionCredits !== null ? plan.sessionCredits : '∞'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {plan.discountPct !== null ? `${plan.discountPct}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={plan.active ? 'success' : 'neutral'}>
                          {plan.active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <form action={togglePlan.bind(null, plan.id, !plan.active)}>
                          <button
                            type="submit"
                            className="text-xs text-text-muted hover:text-text-primary transition-colors"
                          >
                            {plan.active ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <PlanForm />
      </section>

      {/* ─── Active Memberships Section ─── */}
      <section>
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Aktive Mitgliedschaften
        </h2>

        {memberships.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-text-muted">
              Noch keine Mitgliedschaften vergeben. Weise einer Kundin auf der Kunden-Detail-Seite
              einen Plan zu.
            </CardBody>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-raised/40">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Kundin
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Beginn
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Nachste Abrechnung
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Credits
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-raised/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${m.client.id}`}
                          className="font-medium text-text-primary hover:text-accent hover:underline"
                        >
                          {m.client.firstName} {m.client.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{m.plan.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone[m.status]}>{statusLabel[m.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-secondary">
                        {fmtDate(m.startedAt)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-secondary">
                        {m.nextBillingAt ? fmtDate(m.nextBillingAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {m.plan.sessionCredits !== null
                          ? `${m.creditsUsed} / ${m.plan.sessionCredits}`
                          : '∞'}
                      </td>
                      <td className="px-4 py-3">
                        {m.status === 'ACTIVE' || m.status === 'PAUSED' ? (
                          <form action={cancelMembership.bind(null, m.id)}>
                            <button
                              type="submit"
                              className="text-xs text-danger hover:underline transition-colors"
                            >
                              Kundigen
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
