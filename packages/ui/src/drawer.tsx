import * as Dialog from '@radix-ui/react-dialog';
import * as React from 'react';

import { cn } from './cn.js';

// ─── Drawer (seitlich einfahrendes Panel) ─────────────────────
//
// Nutzt dieselbe Radix-Dialog-Primitive wie Modal — Focus-Trap, ESC,
// ARIA-Roles gratis. Unterschied: slide-in-Animation + Volle Höhe.

export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  side?: DrawerSide;
  size?: 'sm' | 'md' | 'lg';
}

const sideClass: Record<DrawerSide, string> = {
  left: 'left-0 top-0 h-full data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  right: 'right-0 top-0 h-full data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  top: 'top-0 left-0 w-full data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
  bottom: 'bottom-0 left-0 w-full data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
};

const sizeClass = {
  horizontal: {
    sm: 'w-[320px]',
    md: 'w-[420px]',
    lg: 'w-[560px]',
  },
  vertical: {
    sm: 'h-[240px]',
    md: 'h-[360px]',
    lg: 'h-[480px]',
  },
} as const;

export function Drawer({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
}: DrawerProps): React.JSX.Element {
  const orientation = side === 'left' || side === 'right' ? 'horizontal' : 'vertical';

  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-surface text-text-primary shadow-xl border-border focus:outline-none',
            'flex flex-col',
            sideClass[side],
            sizeClass[orientation][size],
            side === 'left' && 'border-r',
            side === 'right' && 'border-l',
            side === 'top' && 'border-b',
            side === 'bottom' && 'border-t',
          )}
        >
          <div className="flex items-start justify-between gap-2 p-6 border-b border-border">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-text-secondary">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Schliessen"
              className="rounded-sm p-1 text-text-secondary hover:bg-surface-raised"
            >
              ✕
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-auto p-6">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
