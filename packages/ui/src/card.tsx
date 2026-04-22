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
        'rounded-lg bg-surface border border-border text-text-primary',
        elevation === 'raised' && 'shadow-md',
        elevation === 'hoverable' &&
          'transition-all duration-medium hover:border-border-strong hover:shadow-md',
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('border-b border-border px-5 py-4', className)} {...props} />
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
        className={cn('border-t border-border px-5 py-4 bg-background/30', className)}
        {...props}
      />
    );
  },
);
