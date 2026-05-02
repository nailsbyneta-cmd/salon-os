import * as React from 'react';
import { cn } from './cn.js';

/**
 * Skeleton — placeholder while loading.
 * Never a spinner; always a skeleton that mirrors the end content shape.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[4px] bg-gradient-to-r from-[#F0F0F0] via-[#E8E8E8] to-[#F0F0F0]',
        'bg-[length:200%_100%] animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}
