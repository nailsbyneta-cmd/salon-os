import * as React from 'react';
import { cn } from './cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, error, ...props },
  ref,
) {
  const hasError = invalid || !!error;
  return (
    <div className="relative">
      <input
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          'flex h-9 w-full rounded-[6px] border bg-white px-3 py-2 text-sm text-[#171717]',
          'placeholder:text-[#999999]',
          'transition-colors duration-150',
          hasError
            ? 'border-red-400 pr-10 focus:border-red-400 focus:ring-1 focus:ring-red-400'
            : 'border-[#E0E0E0] hover:border-[#C7C7C7] focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/30 focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#FAFAFA]',
          className,
        )}
        {...props}
      />
      {hasError ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path
              d="M12 7v5M12 17h.01"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full rounded-[6px] border bg-white px-3 py-2 text-sm text-[#171717]',
        'placeholder:text-[#999999] resize-y min-h-[80px]',
        'transition-colors duration-150',
        invalid
          ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400'
          : 'border-[#E0E0E0] hover:border-[#C7C7C7] focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/30 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-9 w-full rounded-[6px] border bg-white px-3 py-2 text-sm text-[#171717]',
        'transition-colors duration-150',
        invalid
          ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400'
          : 'border-[#E0E0E0] hover:border-[#C7C7C7] focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/30 focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#666666]">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </span>
        {error ? (
          <span className="text-[10px] font-medium text-red-500 inline-flex items-center gap-1">
            <span aria-hidden="true">!</span>
            {error}
          </span>
        ) : null}
      </div>
      {children}
      {!error && hint ? <span className="text-xs text-[#999999]">{hint}</span> : null}
    </label>
  );
}
