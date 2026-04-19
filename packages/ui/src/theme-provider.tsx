'use client';
import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'salon-os-theme';

function detectSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(resolved: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}): React.JSX.Element {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? defaultTheme;
    setThemeState(stored);
  }, [defaultTheme]);

  React.useEffect(() => {
    const r = theme === 'system' ? detectSystem() : theme;
    setResolved(r);
    apply(r);
    if (theme !== 'system') localStorage.setItem(STORAGE_KEY, theme);
    else localStorage.removeItem(STORAGE_KEY);
  }, [theme]);

  React.useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (): void => {
      const r = detectSystem();
      setResolved(r);
      apply(r);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    resolved,
    setTheme: setThemeState,
    toggle: () => setThemeState(resolved === 'dark' ? 'light' : 'dark'),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Inline-Script, das direkt beim ersten Paint das korrekte data-theme setzt.
 * Gegen FOUC. In <head> vor allem anderen rendern.
 */
export function ThemeScript(): React.JSX.Element {
  const js = `
    (function(){
      try {
        var k='${STORAGE_KEY}';
        var s=localStorage.getItem(k);
        var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
        var t=s==='dark'||s==='light'?s:p;
        document.documentElement.setAttribute('data-theme',t);
      } catch(_){}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
