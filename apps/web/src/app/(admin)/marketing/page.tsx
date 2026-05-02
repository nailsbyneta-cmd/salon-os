import * as React from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { runReactivation, runBirthday, runRebook } from './actions';

interface CampaignPreview {
  eligible: number;
  lastRunAt: string | null;
  lastRunCount?: number;
}

async function loadPreviews(): Promise<{
  reactivation: CampaignPreview;
  birthday: CampaignPreview;
  rebook: CampaignPreview;
}> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const empty: CampaignPreview = { eligible: 0, lastRunAt: null };

  const [reactivation, birthday, rebook] = await Promise.allSettled([
    apiFetch<CampaignPreview>('/v1/marketing/reactivation', auth),
    apiFetch<CampaignPreview>('/v1/marketing/birthday', auth),
    apiFetch<CampaignPreview>('/v1/marketing/rebook', auth),
  ]);

  return {
    reactivation: reactivation.status === 'fulfilled' ? reactivation.value : empty,
    birthday: birthday.status === 'fulfilled' ? birthday.value : empty,
    rebook: rebook.status === 'fulfilled' ? rebook.value : empty,
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'noch nie';
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CampaignCardProps {
  title: string;
  description: string;
  badge: string;
  eligible: number;
  lastRunAt: string | null;
  lastRunCount?: number;
  cooldownNote: string;
  action: () => Promise<void>;
  actionLabel: string;
  icon: string;
}

function CampaignCard({
  title,
  description,
  badge,
  eligible,
  lastRunAt,
  lastRunCount,
  cooldownNote,
  action,
  actionLabel,
  icon,
}: CampaignCardProps) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xl">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">{title}</h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {badge}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Eligible
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
              {eligible}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Letzter Run
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">{fmtDate(lastRunAt)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              {lastRunCount !== undefined ? 'Letzter Run' : 'Cooldown'}
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {lastRunCount !== undefined ? `${lastRunCount} gesendet` : cooldownNote}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <p className="text-xs text-text-muted">{cooldownNote}</p>
          <form action={action}>
            <button
              type="submit"
              disabled={eligible === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-text-muted disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {eligible === 0 ? 'Niemand eligible' : `${actionLabel} (${eligible})`}
            </button>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function MarketingPage(): Promise<React.JSX.Element> {
  const { reactivation, birthday, rebook } = await loadPreviews();
  const totalEligible = reactivation.eligible + birthday.eligible + rebook.eligible;

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Marketing</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Automatische Kampagnen
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          E-Mail-Automationen die Kundinnen zurückbringen — ohne manuelle Arbeit.
        </p>
      </header>

      {totalEligible > 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="text-lg">📬</span>
          <p className="text-sm font-medium text-text-primary">
            <span className="font-semibold text-accent">{totalEligible} Kundinnen</span> warten
            aktuell auf eine Nachricht.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <CampaignCard
          title="Win-back / Reaktivierung"
          description="Schreibt Kundinnen an, die seit über 90 Tagen nicht da waren. Direktlink zur Online-Buchung im Mail."
          badge="90-Tage-Inaktiv"
          eligible={reactivation.eligible}
          lastRunAt={reactivation.lastRunAt}
          lastRunCount={reactivation.lastRunCount}
          cooldownNote="Max. 1× pro 60 Tage pro Kundin"
          action={runReactivation}
          actionLabel="Jetzt senden"
          icon="💝"
        />

        <CampaignCard
          title="Geburtstags-Gruss"
          description="Schickt heute Geburtstag habenden Kundinnen eine persönliche Mail mit optionalem Rabatt-Code."
          badge="Geburtstag heute"
          eligible={birthday.eligible}
          lastRunAt={birthday.lastRunAt}
          cooldownNote="1× pro Jahr pro Kundin"
          action={runBirthday}
          actionLabel="Jetzt senden"
          icon="🎂"
        />

        <CampaignCard
          title="Rebook-Reminder"
          description="Erinnert Kundinnen deren letzter Besuch 6 Wochen her ist — bevor sie zur Konkurrenz wechseln."
          badge="6-Wochen-Reminder"
          eligible={rebook.eligible}
          lastRunAt={rebook.lastRunAt}
          cooldownNote="Max. 1× pro 30 Tage pro Kundin"
          action={runRebook}
          actionLabel="Jetzt senden"
          icon="🔄"
        />

        <Card className="opacity-60">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl">
                💬
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-text-primary">WhatsApp-Kampagne</h2>
                  <span className="rounded-full bg-text-muted/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Bald verfügbar
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  WhatsApp-Blast für opted-in Kundinnen. Benötigt WhatsApp Business API.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-text-muted">Crons laufen täglich automatisch um 09:00.</p>
        <Link href="/settings" className="text-xs text-accent hover:underline">
          E-Mail-Settings (Postmark) →
        </Link>
      </div>
    </div>
  );
}
