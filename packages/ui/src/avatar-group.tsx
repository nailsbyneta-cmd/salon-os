import * as React from 'react';

import { Avatar, type AvatarProps } from './avatar.js';
import { cn } from './cn.js';

// ─── AvatarGroup ──────────────────────────────────────────────
// Stapelt mehrere Avatars mit negativer-Ring-Überlappung; Rest-Count
// als +N-Chip. Typ. Usage: "Diese 3 Stylists arbeiten heute".

export interface AvatarGroupItem extends Pick<AvatarProps, 'name' | 'src' | 'color' | 'vip'> {
  id: string;
}

export interface AvatarGroupProps {
  people: AvatarGroupItem[];
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({
  people,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps): React.JSX.Element {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const sizeBox =
    size === 'sm' ? 'h-7 w-7 text-[10px]' :
    size === 'lg' ? 'h-12 w-12 text-base' :
    size === 'xl' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-sm';

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'ring-2 ring-surface rounded-full',
            i > 0 && '-ml-2',
          )}
        >
          <Avatar {...p} size={size} />
        </div>
      ))}
      {overflow > 0 ? (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            'bg-surface-raised text-text-secondary font-medium border border-border',
            '-ml-2 ring-2 ring-surface',
            sizeBox,
          )}
          aria-label={`${overflow} weitere Personen`}
        >
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}
