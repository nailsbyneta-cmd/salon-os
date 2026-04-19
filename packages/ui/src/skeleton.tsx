import * as React from 'react';
import { cn } from './cn.js';

/**
 * Skeleton — placeholder während Loading.
 * Niemals Spinner; immer Skeleton, das die Form des Endcontents nachbildet.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-sm bg-gradient-to-r from-border/40 via-border/60 to-border/40',
        'bg-[length:200%_100%] animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}
