'use client';
import * as React from 'react';
import { Button, Card, CardBody } from '@salon-os/ui';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

interface Props {
  appointmentId: string;
  token: string;
  action: 'cancel' | 'reschedule';
}

async function postJson(
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        title?: string;
        detail?: string;
      };
      return { ok: false, error: err.detail ?? err.title ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function SelfServiceActions({
  appointmentId,
  token,
  action,
}: Props): React.JSX.Element {
  const [state, setState] = React.useState<'idle' | 'cancelling' | 'done' | 'error'>(
    'idle',
  );
  const [error, setError] = React.useState<string | null>(null);

  const doCancel = async (): Promise<void> => {
    setState('cancelling');
    const res = await postJson(
      `${API_URL}/v1/public/appointments/${appointmentId}/cancel?t=${encodeURIComponent(token)}`,
    );
    if (res.ok) {
      setState('done');
    } else {
      setState('error');
      setError(res.error ?? 'Fehler beim Stornieren.');
    }
  };

  if (state === 'done') {
    return (
      <Card className="border-l-4 border-l-success bg-success/5">
        <CardBody className="text-center">
          <h3 className="text-lg font-semibold text-text-primary">
            Termin storniert
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Schade, dass du nicht kommen kannst. Wir freuen uns aufs nächste Mal!
          </p>
        </CardBody>
      </Card>
    );
  }

  if (action === 'cancel') {
    return (
      <div className="space-y-3">
        <Button
          variant="danger"
          size="lg"
          className="w-full"
          onClick={doCancel}
          disabled={state === 'cancelling'}
          loading={state === 'cancelling'}
        >
          {state === 'cancelling' ? 'Wird storniert …' : 'Termin stornieren'}
        </Button>
        {state === 'error' && error ? (
          <p className="text-center text-sm text-danger">{error}</p>
        ) : null}
        <p className="text-center text-xs text-text-muted">
          Doch noch kommen? Schliesse einfach dieses Fenster.
        </p>
      </div>
    );
  }

  // Reschedule: MVP — verweist auf öffentliche Buchung mit Hinweis.
  return (
    <Card>
      <CardBody className="text-center">
        <h3 className="text-lg font-semibold text-text-primary">Termin umbuchen</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Um einen neuen Slot zu wählen, storniere bitte diesen Termin und buche
          neu auf der Salon-Seite.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={doCancel} disabled={state === 'cancelling'}>
            Diesen Termin stornieren
          </Button>
        </div>
        {state === 'error' && error ? (
          <p className="mt-2 text-sm text-danger">{error}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
