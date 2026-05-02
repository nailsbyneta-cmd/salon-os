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
 * Apple-style KPI card. Clean white surface, no heavy shadows.
 * Optional trend pill + icon, optional as link.
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
        'group rounded-lg bg-white border border-[#E0E0E0] p-5',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        'transition-all duration-150',
        href &&
          'cursor-pointer hover:-translate-y-px hover:border-[#C7C7C7] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08),_0_1px_2px_rgba(0,0,0,0.04)] active:translate-y-0 active:scale-[0.99]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999999] group-hover:text-[#007AFF] transition-colors">
          {label}
        </span>
        {icon ? <span className="text-[#999999]">{icon}</span> : null}
      </div>
      <div className="mt-2.5 font-sans text-[28px] font-semibold tracking-tight tabular-nums text-[#171717] leading-none">
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-[#999999]">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trend.direction === 'up' && 'text-green-600',
              trend.direction === 'down' && 'text-red-500',
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
