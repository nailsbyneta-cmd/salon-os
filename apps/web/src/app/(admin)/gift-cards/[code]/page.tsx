import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardBody } from '@salon-os/ui';
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

async function load(code: string): Promise<GiftCard | null> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ giftCards: GiftCard[] }>('/v1/gift-cards', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.giftCards.find((c) => c.code === code) ?? null;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function GiftCardDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<React.JSX.Element> {
  const { code } = await params;
  const card = await load(code);
  if (!card) notFound();

  const publicUrl = `https://web-production-e5e8d.up.railway.app/gift-card/${card.code}`;
  const expired = card.expiresAt && new Date(card.expiresAt) < new Date();

  const shareMessageRaw = card.message
    ? `${card.message}\n\nGuthaben: ${Number(card.amount).toFixed(2)} CHF\nCode: ${card.code}\n${publicUrl}`
    : `Du bekommst einen Gutschein! ${Number(card.amount).toFixed(2)} CHF\nCode: ${card.code}\n${publicUrl}`;
  const shareEncoded = encodeURIComponent(shareMessageRaw);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/gift-cards"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Gutscheine
      </Link>

      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Gutschein
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          {card.recipientName ?? 'An eine liebe Person'}
        </h1>
      </header>

      <Card className="overflow-hidden mb-6">
        <div className="bg-gradient-to-br from-brand via-brand to-accent/60 p-6 text-brand-foreground">
          <div className="text-[10px] font-medium uppercase tracking-[0.3em] opacity-80">
            Beautycenter by Neta
          </div>
          <div className="mt-8 font-mono text-2xl font-bold tracking-[0.2em]">
            {card.code}
          </div>
          <div className="mt-8 flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                Guthaben
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">
                {Number(card.balance).toFixed(2)} {card.currency}
              </div>
            </div>
            <Badge
              tone={expired ? 'danger' : Number(card.balance) === 0 ? 'neutral' : 'success'}
              className="bg-white/20 text-white border-white/30"
              dot
            >
              {expired ? 'Abgelaufen' : Number(card.balance) === 0 ? 'Aufgebraucht' : 'Aktiv'}
            </Badge>
          </div>
        </div>
      </Card>

      {card.message ? (
        <Card className="mb-6">
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Nachricht
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-text-primary">
              {card.message}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Teilen (Diff #19)
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Direkt an die Empfängerin schicken — iMessage, WhatsApp, SMS oder Mail.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`sms:&body=${shareEncoded}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-raised"
            >
              💬 iMessage / SMS
            </a>
            <a
              href={`https://wa.me/?text=${shareEncoded}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-raised"
            >
              📱 WhatsApp
            </a>
            {card.recipientEmail ? (
              <a
                href={`mailto:${card.recipientEmail}?subject=${encodeURIComponent(
                  'Gutschein für Beautycenter by Neta',
                )}&body=${shareEncoded}`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-raised"
              >
                ✉️ E-Mail
              </a>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <p className="mt-6 text-xs text-text-muted text-center">
        Ausgestellt am{' '}
        {new Date(card.purchasedAt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
        {card.expiresAt
          ? ` · gültig bis ${new Date(card.expiresAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })}`
          : ''}
      </p>
    </div>
  );
}
