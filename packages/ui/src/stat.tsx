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
        'transition-all duration-medium',
        href && 'hover:border-border-strong hover:shadow-md cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {icon ? <span className="text-text-muted">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
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
