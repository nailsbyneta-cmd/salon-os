import * as React from 'react';
import { cn } from './cn.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — niemals nur „keine Daten". Immer Illustration + nächste Aktion.
 * Icon via Slot, z. B. ein lucide-icon oder unser minimaler SVG-Platzhalter.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        'animate-fade-in',
        className,
      )}
    >
      {icon ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-text-muted ring-1 ring-border">
          {icon}
        </div>
      ) : (
        <DefaultIllustration />
      )}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description ? <p className="max-w-md text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function DefaultIllustration(): React.JSX.Element {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="44"
        cy="44"
        r="40"
        className="stroke-border"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <path
        d="M28 44h32M44 28v32"
        className="stroke-text-muted"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
