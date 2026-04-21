import * as React from 'react';
import { cn } from './cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-sm border bg-surface px-3 py-2 text-base text-text-primary md:text-sm',
          'placeholder:text-text-muted',
          'transition-colors duration-fast',
          invalid ? 'border-danger' : 'border-border hover:border-border-strong focus:border-accent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full rounded-sm border bg-surface px-3 py-2 text-base text-text-primary md:text-sm',
        'placeholder:text-text-muted resize-y min-h-[80px]',
        'transition-colors duration-fast',
        invalid ? 'border-danger' : 'border-border hover:border-border-strong focus:border-accent',
        className,
      )}
      {...props}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-sm border bg-surface px-3 py-2 text-base text-text-primary md:text-sm',
          'transition-colors duration-fast',
          invalid ? 'border-danger' : 'border-border hover:border-border-strong focus:border-accent',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

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
      <span className="text-xs font-medium text-text-secondary">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
