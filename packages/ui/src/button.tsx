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
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 ease-out select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

const variantStyle: Record<Variant, string> = {
  primary:
    'bg-[#007AFF] text-white hover:bg-[#0066DD] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_1px_3px_rgba(0,122,255,0.3)]',
  accent:
    'bg-[#007AFF] text-white hover:bg-[#0066DD] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_1px_3px_rgba(0,122,255,0.3)]',
  secondary:
    'bg-white text-[#171717] border border-[#E0E0E0] hover:bg-[#F5F5F5] hover:border-[#C7C7C7] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
  ghost: 'text-[#666666] hover:bg-[#F5F5F5] hover:text-[#171717]',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
  link: 'text-[#007AFF] underline-offset-4 hover:underline px-0',
};

const sizeStyle: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs rounded-[6px]',
  md: 'h-9 px-4 text-sm rounded-[6px]',
  lg: 'h-11 px-6 text-base rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});
