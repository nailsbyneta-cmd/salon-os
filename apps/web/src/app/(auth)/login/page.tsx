import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Login — SALON OS',
};

export default function LoginPage(): React.JSX.Element {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">
          SALON OS
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          Magic-Link-Login für dein Salon-Cockpit.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
