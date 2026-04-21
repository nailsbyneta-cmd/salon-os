import * as RadixPopover from '@radix-ui/react-popover';
import * as React from 'react';

import { cn } from './cn.js';

// ─── Popover ──────────────────────────────────────────────────
// Kontextuelles, schwebendes UI (Menüs, Filter-Panels, Info-Boxen).
// Keine Focus-Trap wie Modal/Drawer, dafür Collision-Awareness gegen
// Viewport-Ränder via Radix.

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  className,
}: PopoverProps): React.JSX.Element {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'z-50 rounded-md bg-surface text-text-primary shadow-xl border border-border',
            'p-3 min-w-[200px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out',
            className,
          )}
        >
          {children}
          <RadixPopover.Arrow className="fill-[var(--color-surface,#fff)]" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
