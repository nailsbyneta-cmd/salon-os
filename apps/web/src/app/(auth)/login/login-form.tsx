'use client';

import * as React from 'react';
import { Button, Field, Input, ShakeOnError } from '@salon-os/ui';

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'awaiting-code'; email: string }
  | { kind: 'exchanging' }
  | { kind: 'error'; message: string; prev: Phase['kind'] }
  | { kind: 'success' };

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] ??
  process.env['PUBLIC_API_URL'] ??
  'http://localhost:4000';

export function LoginForm(): React.JSX.Element {
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [shakeTick, setShakeTick] = React.useState(0);

  const signalError = (message: string): void => {
    setPhase((prev) => ({
      kind: 'error',
      message,
      prev: prev.kind === 'error' ? prev.prev : prev.kind,
    }));
    setShakeTick((t) => t + 1);
  };

  const requestLink = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setPhase({ kind: 'sending' });
    try {
      const res = await fetch(`${API_URL}/v1/auth/magic-link`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPhase({ kind: 'awaiting-code', email });
    } catch (err) {
      signalError(`Login-Link konnte nicht verschickt werden: ${(err as Error).message}`);
    }
  };

  const exchangeCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setPhase({ kind: 'exchanging' });
    try {
      const res = await fetch(`${API_URL}/v1/auth/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPhase({ kind: 'success' });
      // Server hat Session-Cookie gesetzt — Admin-Dashboard laden.
      window.location.href = '/';
    } catch (err) {
      signalError(`Code akzeptiert nicht: ${(err as Error).message}`);
    }
  };

  const currentPhase = phase.kind === 'error' ? phase.prev : phase.kind;
  const errorMessage = phase.kind === 'error' ? phase.message : undefined;

  if (currentPhase === 'idle' || currentPhase === 'sending') {
    return (
      <ShakeOnError active={phase.kind === 'error'} key={shakeTick}>
        <form onSubmit={requestLink} className="flex flex-col gap-3">
          <Field
            label="E-Mail"
            hint="Wir schicken dir einen 6-stelligen Code per Mail."
            error={errorMessage}
          >
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
            />
          </Field>
          <Button type="submit" loading={phase.kind === 'sending'}>
            Login-Link senden
          </Button>
        </form>
      </ShakeOnError>
    );
  }

  return (
    <ShakeOnError active={phase.kind === 'error'} key={shakeTick}>
      <form onSubmit={exchangeCode} className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          Wir haben einen Code an <strong>{email}</strong> geschickt.
          Trag ihn unten ein.
        </p>
        <Field label="Magic-Code" error={errorMessage}>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            data-testid="login-code"
          />
        </Field>
        <Button
          type="submit"
          loading={phase.kind === 'exchanging'}
          data-testid="login-submit-code"
        >
          Einloggen
        </Button>
        <button
          type="button"
          onClick={() => setPhase({ kind: 'idle' })}
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          ← Andere E-Mail verwenden
        </button>
      </form>
    </ShakeOnError>
  );
}
