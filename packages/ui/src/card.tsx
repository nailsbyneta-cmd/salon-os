import * as React from 'react';
import { cn } from './cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised' | 'hoverable';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevation = 'flat', ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg bg-white border border-[#E0E0E0] text-[#171717]',
        elevation === 'flat' && 'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        elevation === 'raised' && 'shadow-[0_1px_3px_rgba(0,0,0,0.08),_0_1px_2px_rgba(0,0,0,0.04)]',
        elevation === 'hoverable' &&
          'shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200 hover:border-[#C7C7C7] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08),_0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('border-b border-[#E0E0E0] px-5 py-4', className)} {...props} />
    );
  },
);

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-5', className)} {...props} />;
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('border-t border-[#E0E0E0] px-5 py-4 bg-[#FAFAFA]', className)}
        {...props}
      />
    );
  },
);
