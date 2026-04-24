import * as React from 'react';
import { cn } from './cn.js';

export interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  icon?: React.ReactNode;
  href?: string;
  className?: string;
}

/**
 * Stripe-Dashboard-ähnliche KPI-Karte. Nutzt Fluid-Typography,
 * optional Trend-Pill + Icon, optional als Link.
 */
export function Stat({
  label,
  value,
  sub,
  trend,
  icon,
  href,
  className,
}: StatProps): React.JSX.Element {
  const body = (
    <div
      className={cn(
        'group rounded-lg bg-surface border border-border p-5',
        'transition-all duration-200',
        href &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md active:translate-y-0 active:scale-[0.99]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted group-hover:text-accent transition-colors">
          {label}
        </span>
        {icon ? <span className="text-text-muted">{icon}</span> : null}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trend.direction === 'up' && 'text-success',
              trend.direction === 'down' && 'text-danger',
            )}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '·'}
            {trend.value}
          </span>
        ) : null}
        {sub ? <span>{sub}</span> : null}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block">
        {body}
      </a>
    );
  }
  return body;
}
