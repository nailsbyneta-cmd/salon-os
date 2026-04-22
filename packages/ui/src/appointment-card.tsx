import * as React from 'react';
import { cn } from './cn.js';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'WAITLIST';

export interface AppointmentCardProps {
  clientName: string;
  serviceLabel: string;
  staffLabel: string;
  timeLabel: string;
  status: AppointmentStatus;
  staffColor?: string | null;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** Wenn gesetzt, nur eine 1-Zeilen-Variante (für enge Slots) */
  compact?: boolean;
  /** 0–100. Wenn ≥ 40, zeigen wir eine rote ⚠-Ecke an. */
  noShowRisk?: number | null;
  /** Wenn true, rechts oben einen VIP-Stern. */
  vip?: boolean;
}

const statusTone: Record<AppointmentStatus, string> = {
  BOOKED: 'bg-info/10 text-info',
  CONFIRMED: 'bg-success/10 text-success',
  CHECKED_IN: 'bg-warning/10 text-warning',
  IN_SERVICE: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-surface-raised text-text-muted',
  CANCELLED: 'bg-danger/10 text-danger opacity-75',
  NO_SHOW: 'bg-danger/10 text-danger opacity-75',
  WAITLIST: 'bg-text-muted/10 text-text-secondary',
};

/**
 * Kalender-Termin-Karte. Linker Rand ist Staff-Farbe, Hintergrund ist
 * Status-getönt. Klickbar öffnet Detail.
 */
export function AppointmentCard({
  clientName,
  serviceLabel,
  staffLabel,
  timeLabel,
  status,
  staffColor,
  onClick,
  className,
  style,
  compact,
  noShowRisk,
  vip,
}: AppointmentCardProps): React.JSX.Element {
  const tone = statusTone[status];
  const isTerminal = status === 'CANCELLED' || status === 'NO_SHOW' || status === 'COMPLETED';
  // Tier-Stufen analog ClientBrief: mittel 25-39 (amber), hoch >=40 (rot).
  const riskNum = typeof noShowRisk === 'number' && Number.isFinite(noShowRisk) ? noShowRisk : null;
  const riskTier: 'hoch' | 'mittel' | null =
    isTerminal || riskNum === null
      ? null
      : riskNum >= 40
        ? 'hoch'
        : riskNum >= 25
          ? 'mittel'
          : null;
  const showVip = vip && !isTerminal;
  const a11yNote = [
    riskTier === 'hoch' ? 'hohes No-Show-Risiko' : null,
    riskTier === 'mittel' ? 'mittleres No-Show-Risiko' : null,
    showVip ? 'VIP-Kundin' : null,
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...style,
        borderLeftColor: staffColor ?? 'hsl(var(--border-strong))',
      }}
      className={cn(
        'group relative block w-full text-left rounded-md border border-border border-l-[3px]',
        'px-2.5 py-1.5 text-left',
        'transition-all duration-fast ease-out-expo',
        'hover:shadow-md hover:border-border-strong hover:-translate-y-[1px]',
        'active:scale-[0.99]',
        tone,
        riskTier === 'hoch' ? 'ring-1 ring-danger/40' : null,
        riskTier === 'mittel' ? 'ring-1 ring-warning/40' : null,
        className,
      )}
      aria-label={a11yNote.length > 0 ? `${clientName} — ${a11yNote.join(', ')}` : undefined}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs font-medium">
        <span className="flex min-w-0 items-center gap-1">
          {riskTier === 'hoch' ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-danger text-[9px] font-bold leading-none text-white"
              title={`No-Show-Risiko ${Math.round(riskNum!)}%`}
              aria-hidden="true"
            >
              !
            </span>
          ) : riskTier === 'mittel' ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-warning text-[9px] font-bold leading-none text-white"
              title={`No-Show-Risiko ${Math.round(riskNum!)}%`}
              aria-hidden="true"
            >
              !
            </span>
          ) : null}
          {showVip ? (
            <span
              className="shrink-0 text-[10px] leading-none text-accent"
              title="VIP (Lifetime >= 2000 CHF)"
              aria-hidden="true"
            >
              ★
            </span>
          ) : null}
          <span className="min-w-0 truncate">{clientName}</span>
        </span>
        {staffLabel ? (
          <span className="shrink-0 text-[10px] font-semibold opacity-75 tabular-nums">
            {staffLabel}
          </span>
        ) : null}
      </div>
      {!compact ? (
        <>
          <div className="mt-0.5 text-[11px] truncate opacity-80">{serviceLabel}</div>
          <div className="text-[10px] opacity-60 truncate">{timeLabel}</div>
        </>
      ) : null}
    </button>
  );
}
