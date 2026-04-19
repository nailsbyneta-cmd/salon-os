import * as React from 'react';
import { cn } from './cn.js';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const toneStyle: Record<Tone, string> = {
  neutral:
    'bg-surface-raised text-text-secondary border border-border',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  info: 'bg-info/10 text-info border border-info/20',
  accent: 'bg-accent/10 text-accent border border-accent/30',
  brand: 'bg-brand/10 text-brand border border-brand/20',
};

const dotColor: Record<Tone, string> = {
  neutral: 'bg-text-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  brand: 'bg-brand',
};

export function Badge({
  className,
  tone = 'neutral',
  dot,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        toneStyle[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-sm font-mono text-[10px] font-medium',
        'bg-surface-raised text-text-secondary border border-border shadow-sm',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
