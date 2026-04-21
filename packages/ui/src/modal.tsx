import * as Dialog from '@radix-ui/react-dialog';
import * as React from 'react';

import { cn } from './cn.js';

// ─── Modal (Radix-Dialog unter der Haube) ─────────────────────
//
// Accessible out of the box: Focus-Trap, ESC-Close, ARIA-Roles.
// Tailwind-Klassen nutzen Design-Tokens aus tokens.css.
// Keine `shadcn/ui`-Dep — wir bleiben bei Radix direkt.

export interface ModalProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out',
          )}
        />
        <Dialog.Content
          onPointerDownOutside={(event) => {
            if (!closeOnOverlayClick) event.preventDefault();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg bg-surface text-text-primary shadow-xl border border-border',
            'p-6 focus:outline-none',
            sizeClass[size],
          )}
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-text-secondary">
              {description}
            </Dialog.Description>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? (
            <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>
          ) : null}
          <Dialog.Close
            aria-label="Schliessen"
            className="absolute right-4 top-4 rounded-sm p-1 text-text-secondary hover:bg-surface-raised"
          >
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
