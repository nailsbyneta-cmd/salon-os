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
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-14 w-14 text-lg',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar. Shows photo when available, otherwise color-coded initials.
 * VIP ring: blue accent ring around the avatar.
 */
export function Avatar({
  src,
  name,
  color,
  size = 'md',
  vip,
  className,
}: AvatarProps): React.JSX.Element {
  const bg = color ?? '#007AFF';
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizeClass[size],
        vip && 'ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white',
        className,
      )}
      style={src ? undefined : { backgroundColor: bg }}
      aria-label={name}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}
