import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface GiftCard {
  id: string;
  code: string;
  amount: string;
  balance: string;
  currency: string;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  purchasedAt: string;
  redeemedAt: string | null;
  expiresAt: string | null;
}

async function load(): Promise<GiftCard[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ giftCards: GiftCard[] }>('/v1/gift-cards', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.giftCards;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function GiftCardsPage(): Promise<React.JSX.Element> {
  const cards = await load();
  const totalSold = cards.reduce((s, c) => s + Number(c.amount), 0);
  const totalOutstanding = cards.reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Gift-Cards
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Gutscheine
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {cards.length} Stück · verkauft {totalSold.toFixed(2)} CHF · offen{' '}
            {totalOutstanding.toFixed(2)} CHF
          </p>
        </div>
        <Link href="/gift-cards/new">
          <Button
            variant="primary"
            iconLeft={<span className="text-base leading-none">+</span>}
          >
            Neuer Gutschein
          </Button>
        </Link>
      </header>

      {cards.length === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Gutscheine"
            description="Ideal als Geschenk oder Guthaben-Karte. Leg den ersten an — der Code ist teilbar via iMessage oder WhatsApp."
            action={
              <Link href="/gift-cards/new">
                <Button variant="accent">+ Gutschein ausstellen</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Code</th>
                  <th className="hidden px-4 py-3 md:table-cell md:px-5">
                    Empfänger
                  </th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">
                    Betrag
                  </th>
                  <th className="px-4 py-3 text-right sm:px-5">Guthaben</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-5">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">
                    Gültig bis
                  </th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const empty = Number(c.balance) <= 0;
                  const status = expired
                    ? ('expired' as const)
                    : empty
                      ? ('empty' as const)
                      : ('active' as const);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-text-primary sm:px-5">
                        <Link
                          href={`/gift-cards/${c.code}`}
                          className="block hover:underline"
                        >
                          {c.code}
                        </Link>
                        {/* Mobile-only: Empfänger unter Code */}
                        {c.recipientName ? (
                          <div className="mt-0.5 font-sans text-[11px] font-normal text-text-muted md:hidden">
                            {c.recipientName}
                          </div>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-text-secondary md:table-cell md:px-5">
                        {c.recipientName ?? '—'}
                        {c.recipientEmail ? (
                          <span className="ml-2 text-xs text-text-muted">
                            · {c.recipientEmail}
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">
                        <PriceDisplay
                          amount={c.amount}
                          currency={c.currency}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <PriceDisplay
                          amount={c.balance}
                          currency={c.currency}
                          size="sm"
                        />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell sm:px-5">
                        <Badge
                          tone={
                            status === 'active'
                              ? 'success'
                              : status === 'empty'
                                ? 'neutral'
                                : 'danger'
                          }
                          dot
                        >
                          {status === 'active'
                            ? 'Aktiv'
                            : status === 'empty'
                              ? 'Aufgebraucht'
                              : 'Abgelaufen'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-text-muted text-xs lg:table-cell lg:px-5">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString('de-CH', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
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
