import * as React from 'react';

import { Button } from './button.js';
import { cn } from './cn.js';

// ─── ErrorBoundary ────────────────────────────────────────────
//
// Class-Component, weil React Hooks keinen `componentDidCatch` haben.
// Fängt Render-/Lifecycle-Fehler in ihrem Subtree und zeigt einen
// stabilen Fallback mit Reset-Knopf. Fehler werden an `onError`
// durchgereicht (typ. Sentry / OTel-Span-Event).

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((args: { error: Error; reset: () => void }) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.reset });
    }
    if (fallback) return fallback;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          'rounded-md border border-danger/30 bg-danger/5 p-6',
          this.props.className,
        )}
      >
        <h2 className="text-base font-semibold text-danger">
          Etwas ist schiefgelaufen
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {error.message || 'Unerwarteter Fehler im UI-Baum.'}
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={this.reset}>
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }
}
