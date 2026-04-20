'use client';
import * as React from 'react';
import { cn } from './cn.js';

type Tone = 'success' | 'info' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  tone: Tone;
  title: string;
  description?: string;
  /** ms — default 4000 */
  duration?: number;
}

interface ToastContextValue {
  push: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires <ToastProvider>');
  return ctx;
}

const toneStyle: Record<Tone, string> = {
  success: 'border-success/50 bg-success/10 text-success',
  info: 'border-info/50 bg-info/10 text-info',
  warning: 'border-warning/50 bg-warning/10 text-warning',
  danger: 'border-danger/50 bg-danger/10 text-danger',
};

const toneIcon: Record<Tone, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '!',
  danger: '✕',
};

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { id, ...t };
      setItems((prev) => [...prev, item]);
      const duration = t.duration ?? 4000;
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    },
    [],
  );

  const value = React.useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border bg-surface-raised px-4 py-3 shadow-lg animate-fade-in',
              toneStyle[t.tone],
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
              {toneIcon[t.tone]}
            </span>
            <div className="flex-1 text-sm">
              <div className="font-medium text-text-primary">{t.title}</div>
              {t.description ? (
                <div className="mt-0.5 text-xs text-text-secondary">
                  {t.description}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-text-muted transition-colors hover:text-text-primary"
              aria-label="Schliessen"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
