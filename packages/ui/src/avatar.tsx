import * as React from 'react';
import { cn } from './cn.js';

type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  name: string;
  color?: string | null;
  size?: Size;
  vip?: boolean;
  className?: string;
}

const sizeClass: Record<Size, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * ClientAvatar / StaffAvatar. Zeigt Foto wenn vorhanden, sonst farbige Initialen.
 * VIP-Ring via `vip` — Gold-Akzent-Ring drum.
 */
export function Avatar({
  src,
  name,
  color,
  size = 'md',
  vip,
  className,
}: AvatarProps): React.JSX.Element {
  const bg = color ?? '#737373';
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizeClass[size],
        vip && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
        className,
      )}
      style={src ? undefined : { backgroundColor: bg }}
      aria-label={name}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}
