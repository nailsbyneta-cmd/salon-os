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
  success: 'border-green-200 bg-white text-green-700',
  info: 'border-blue-200 bg-white text-[#007AFF]',
  warning: 'border-orange-200 bg-white text-orange-600',
  danger: 'border-red-200 bg-white text-red-600',
};

const toneIconBg: Record<Tone, string> = {
  success: 'bg-green-100 text-green-600',
  info: 'bg-blue-50 text-[#007AFF]',
  warning: 'bg-orange-100 text-orange-600',
  danger: 'bg-red-100 text-red-600',
};

const toneIcon: Record<Tone, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '!',
  danger: '✕',
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = { id, ...t };
    setItems((prev) => [...prev, item]);
    const duration = t.duration ?? 4000;
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }, []);

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
              'pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3',
              'shadow-[0_4px_6px_rgba(0,0,0,0.07),_0_2px_4px_rgba(0,0,0,0.05)]',
              'animate-fade-in',
              toneStyle[t.tone],
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                toneIconBg[t.tone],
              )}
            >
              {toneIcon[t.tone]}
            </span>
            <div className="flex-1 text-sm">
              <div className="font-medium text-[#171717]">{t.title}</div>
              {t.description ? (
                <div className="mt-0.5 text-xs text-[#666666]">{t.description}</div>
              ) : null}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-[#999999] transition-colors hover:text-[#171717] shrink-0"
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
