import * as React from 'react';
import { cn } from './cn.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const baseStyle =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-fast ease-out-expo select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

const variantStyle: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md',
  accent:
    'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md',
  secondary:
    'bg-surface text-text-primary border border-border hover:bg-surface-raised hover:border-border-strong',
  ghost: 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
  danger:
    'bg-danger text-white hover:opacity-90 shadow-sm hover:shadow-md',
  link: 'text-text-primary underline-offset-4 hover:underline px-0',
};

const sizeStyle: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      iconLeft,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          baseStyle,
          variantStyle[variant],
          sizeStyle[size],
          variant === 'link' && 'h-auto',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);
