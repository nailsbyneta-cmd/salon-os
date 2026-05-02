import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { togglePromoCode } from './actions';
import { PromoFormModal } from './promo-form';

interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrderChf: string | null;
  maxUsages: number | null;
  usages: number;
  active: boolean;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
}

async function loadPromoCodes(): Promise<PromoCode[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ promoCodes: PromoCode[] }>('/v1/promo-codes', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.promoCodes;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function PromoCodesPage(): Promise<React.JSX.Element> {
  const codes = await loadPromoCodes();
  const activeCodes = codes.filter((c) => c.active);

  return (
    <div className="w-full p-4 md:p-8">
      {/* Top nav: tabs between Gutscheine and Rabatt-Codes */}
      <nav className="mb-6 flex gap-1 border-b border-border pb-0">
        <Link
          href="/gift-cards"
          className="rounded-t-md px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Gutscheine
        </Link>
        <span
          className="rounded-t-md border-b-2 border-accent px-4 py-2.5 text-sm font-medium text-accent"
          aria-current="page"
        >
          Rabatt-Codes
        </span>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Promo-Codes
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Rabatt-Codes
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {codes.length} Codes · {activeCodes.length} aktiv
          </p>
        </div>
        <PromoFormModal />
      </header>

      {codes.length === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Rabatt-Codes"
            description="Erstelle Aktionscodes mit Prozent- oder Fixbetrag-Rabatt fur den POS-Checkout."
            action={<PromoFormModal />}
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Code</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-5">Typ / Wert</th>
                  <th className="hidden px-4 py-3 md:table-cell md:px-5">Einlösungen</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">Gültig bis</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">Notiz</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const exhausted = c.maxUsages !== null && c.usages >= c.maxUsages;
                  const effectivelyActive = c.active && !expired && !exhausted;

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <span className="font-mono font-semibold text-text-primary">{c.code}</span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell sm:px-5">
                        <Badge tone={c.type === 'PERCENT' ? 'info' : 'brand'}>
                          {c.type === 'PERCENT'
                            ? `${Number(c.value).toFixed(0)} %`
                            : `CHF ${Number(c.value).toFixed(2)}`}
                        </Badge>
                        {c.minOrderChf ? (
                          <span className="ml-2 text-xs text-text-muted">
                            ab {Number(c.minOrderChf).toFixed(2)} CHF
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell md:px-5 tabular-nums">
                        {c.usages}
                        {c.maxUsages !== null ? (
                          <span className="text-text-muted"> / {c.maxUsages}</span>
                        ) : (
                          <span className="text-text-muted"> / &infin;</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-text-muted lg:table-cell lg:px-5">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString('de-CH', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="hidden max-w-[180px] truncate px-4 py-3 text-xs text-text-muted lg:table-cell lg:px-5">
                        {c.note ?? '—'}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Badge
                          tone={effectivelyActive ? 'success' : expired ? 'danger' : 'neutral'}
                          dot
                        >
                          {effectivelyActive
                            ? 'Aktiv'
                            : expired
                              ? 'Abgelaufen'
                              : exhausted
                                ? 'Aufgebraucht'
                                : 'Inaktiv'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <form
                          action={async () => {
                            'use server';
                            await togglePromoCode(c.id, !c.active);
                          }}
                        >
                          <Button type="submit" variant="ghost" size="sm">
                            {c.active ? 'Deaktivieren' : 'Aktivieren'}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
