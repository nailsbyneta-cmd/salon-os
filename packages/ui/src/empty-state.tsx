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
 * EmptyState — niemals nur "keine Daten". Immer Illustration + nächste Aktion.
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
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F5] text-[#999999] ring-1 ring-[#E0E0E0]">
          {icon}
        </div>
      ) : (
        <DefaultIllustration />
      )}
      <h3 className="text-base font-semibold text-[#171717]">{title}</h3>
      {description ? <p className="max-w-md text-sm text-[#666666]">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function DefaultIllustration(): React.JSX.Element {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="40" cy="40" r="36" stroke="#E0E0E0" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M24 40h32M40 24v32" stroke="#C7C7C7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
