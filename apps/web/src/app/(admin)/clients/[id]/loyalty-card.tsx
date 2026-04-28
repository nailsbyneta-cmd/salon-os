'use client';

import * as React from 'react';
import { Card, CardBody, useToast } from '@salon-os/ui';
import { awardStamps, redeemReward, adjustStamps } from '@/app/(admin)/settings/loyalty/actions';

interface Props {
  clientId: string;
  clientFirstName: string;
  program: {
    name: string;
    redeemThreshold: number;
    rewardLabel: string;
  };
  balance: {
    balance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    rewardsAvailable: number;
  };
  stamps: Array<{
    id: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    notes: string | null;
    createdAt: string;
  }>;
}

const REASON_LABELS: Record<string, string> = {
  AWARD: 'Erhalten',
  REDEEM: 'Eingelöst',
  ADJUST: 'Korrektur',
  EXPIRE: 'Verfallen',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

/**
 * Loyalty-Stempelkarte für die Client-Detail-Page.
 *
 * Visuell: progress-bar Richtung redeemThreshold, "Reward verfügbar" Badge
 * wenn balance ≥ Schwelle, Buttons fürs manuelle Award/Redeem/Adjust,
 * History der letzten 10 Mutations.
 *
 * Auto-Award beim Termin-COMPLETED läuft im Backend — die Buttons hier
 * sind für Edge-Cases (Kundin hat heute fürs Sterne-Foto eines verdient,
 * Geburtstags-Bonus, manuelle Korrektur).
 */
export function LoyaltyCard(props: Props): React.JSX.Element {
  const { clientId, clientFirstName, program, balance, stamps } = props;
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();

  const pct = Math.min(100, (balance.balance / program.redeemThreshold) * 100);
  const remaining = Math.max(0, program.redeemThreshold - balance.balance);

  const onAward = (delta: number): void => {
    startTransition(async () => {
      try {
        await awardStamps(clientId, delta);
        toast.push({
          tone: 'success',
          title: `+${delta} Stempel`,
          description: `Gutgeschrieben für ${clientFirstName}`,
        });
      } catch (e) {
        toast.push({
          tone: 'danger',
          title: 'Fehler',
          description: e instanceof Error ? e.message : 'Konnte nicht awarden.',
        });
      }
    });
  };

  const onRedeem = (): void => {
    if (balance.rewardsAvailable === 0) return;
    if (!window.confirm(`Reward "${program.rewardLabel}" einlösen?`)) return;
    startTransition(async () => {
      try {
        await redeemReward(clientId);
        toast.push({
          tone: 'success',
          title: '🎉 Reward eingelöst',
          description: program.rewardLabel,
        });
      } catch (e) {
        toast.push({
          tone: 'danger',
          title: 'Fehler',
          description: e instanceof Error ? e.message : 'Konnte nicht einlösen.',
        });
      }
    });
  };

  const onAdjust = (): void => {
    const raw = window.prompt('Korrektur (z.B. +3 oder -2):');
    if (!raw) return;
    const delta = parseInt(raw.trim(), 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.push({ tone: 'warning', title: 'Ungültig', description: 'Bitte ganze Zahl ≠ 0.' });
      return;
    }
    const note = window.prompt('Begründung (optional):') ?? undefined;
    startTransition(async () => {
      try {
        await adjustStamps(clientId, delta, note);
        toast.push({
          tone: 'success',
          title: `Korrektur ${delta > 0 ? '+' : ''}${delta}`,
        });
      } catch (e) {
        toast.push({
          tone: 'danger',
          title: 'Fehler',
          description: e instanceof Error ? e.message : 'Konnte nicht korrigieren.',
        });
      }
    });
  };

  return (
    <Card className="mb-8">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              {program.name}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {balance.balance}{' '}
              <span className="text-sm text-text-muted">/ {program.redeemThreshold}</span>{' '}
              <span className="text-sm font-normal text-text-secondary">Stempel</span>
            </p>
            {balance.rewardsAvailable > 0 ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                🎁 {balance.rewardsAvailable}× {program.rewardLabel} verfügbar
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">
                Noch {remaining} Stempel bis {program.rewardLabel}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-text-muted">
            <div>
              Lifetime: <span className="tabular-nums">+{balance.lifetimeEarned}</span>
            </div>
            <div>
              Eingelöst: <span className="tabular-nums">−{balance.lifetimeRedeemed}</span>
            </div>
          </div>
        </div>

        {/* Progress-Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Action-Buttons */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            disabled={pending}
            onClick={() => onAward(1)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium hover:border-accent/50 disabled:opacity-50"
          >
            +1 Stempel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onAward(5)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium hover:border-accent/50 disabled:opacity-50"
          >
            +5 Stempel
          </button>
          <button
            type="button"
            disabled={pending || balance.rewardsAvailable === 0}
            onClick={onRedeem}
            className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-700 hover:border-emerald-500 disabled:opacity-40"
          >
            🎁 Reward einlösen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onAdjust}
            className="ml-auto rounded-md border border-border bg-surface px-3 py-1.5 text-text-muted hover:border-accent/50 disabled:opacity-50"
          >
            ± Korrektur
          </button>
        </div>

        {/* History */}
        {stamps.length > 0 ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-text-muted hover:text-text-primary">
              Verlauf ({stamps.length})
            </summary>
            <ul className="mt-2 divide-y divide-border/40">
              {stamps.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-text-secondary">
                      {REASON_LABELS[s.reason] ?? s.reason}
                    </span>
                    {s.notes ? (
                      <span className="ml-2 text-text-muted italic">— {s.notes}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span
                      className={
                        s.delta > 0 ? 'font-medium text-emerald-700' : 'font-medium text-rose-700'
                      }
                    >
                      {s.delta > 0 ? '+' : ''}
                      {s.delta}
                    </span>
                    <span className="text-text-muted">{fmtDate(s.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}
