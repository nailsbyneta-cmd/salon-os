import * as RadixTooltip from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from './cn.js';

// ─── Tooltip ──────────────────────────────────────────────────
// Für Keyboard-Shortcuts, Icon-Only-Buttons, Truncated-Text.
// WICHTIG: `<TooltipProvider>` muss EINMAL oben im Tree sitzen — typ.
// im App-Root. Ohne Provider werden Tooltips nicht angezeigt.

export interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayDuration?: number;
}

export function TooltipProvider({
  children,
  delayDuration = 300,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}): React.JSX.Element {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      {children}
    </RadixTooltip.Provider>
  );
}

export function Tooltip({
  children,
  content,
  side = 'top',
  delayDuration,
}: TooltipProps): React.JSX.Element {
  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 rounded-md bg-text-primary text-surface',
            'px-2 py-1 text-xs font-medium shadow-lg',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in',
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--color-text-primary,#111)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
