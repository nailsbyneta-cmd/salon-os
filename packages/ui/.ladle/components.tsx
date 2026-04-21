import type { GlobalProvider } from '@ladle/react';
import * as React from 'react';
import '../src/tokens.css';

// Ladle wickelt jede Story mit diesem Provider. Damit die Design-Tokens
// sichtbar sind, ziehen wir die tokens.css direkt hier rein — in der Library
// würden sie sonst nur von Konsumenten geladen.
export const Provider: GlobalProvider = ({ children, globalState }) => {
  React.useEffect(() => {
    const root = document.documentElement;
    if (globalState.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [globalState.theme]);

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--color-fg, #111)',
        background: 'var(--color-bg, #fff)',
        padding: '1.5rem',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
};
