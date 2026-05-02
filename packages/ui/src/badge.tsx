import * as React from 'react';
import { cn } from './cn.js';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const toneStyle: Record<Tone, string> = {
  neutral: 'bg-[#F5F5F5] text-[#666666] border border-[#E0E0E0]',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-orange-50 text-orange-600 border border-orange-200',
  danger: 'bg-red-50 text-red-600 border border-red-200',
  info: 'bg-blue-50 text-[#007AFF] border border-blue-200',
  accent: 'bg-blue-50 text-[#007AFF] border border-blue-200',
  brand: 'bg-blue-50 text-[#007AFF] border border-blue-200',
};

const dotColor: Record<Tone, string> = {
  neutral: 'bg-[#999999]',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-[#007AFF]',
  accent: 'bg-[#007AFF]',
  brand: 'bg-[#007AFF]',
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
      {dot ? <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])} /> : null}
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
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[4px] font-mono text-[10px] font-medium',
        'bg-[#F5F5F5] text-[#666666] border border-[#E0E0E0] shadow-[0_1px_1px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
