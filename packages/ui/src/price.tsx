import * as React from 'react';
import { cn } from './cn.js';

export interface PriceDisplayProps {
  amount: number | string;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  strikethrough?: boolean;
  className?: string;
}

/**
 * Einheitliche Preis-Darstellung. Zahlenteil mit tabular-nums + feste
 * Nachkomma-Stellen, damit Preise in Listen unter einander stehen.
 */
export function PriceDisplay({
  amount,
  currency = 'CHF',
  size = 'md',
  strikethrough,
  className,
}: PriceDisplayProps): React.JSX.Element {
  const num = typeof amount === 'number' ? amount : Number(amount);
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 tabular-nums',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base font-semibold',
        strikethrough && 'text-text-muted line-through',
        className,
      )}
    >
      <span className="font-medium">
        {num.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
      </span>
      <span className={cn('text-text-muted', size === 'lg' && 'text-xs font-medium')}>
        {currency}
      </span>
    </span>
  );
}
