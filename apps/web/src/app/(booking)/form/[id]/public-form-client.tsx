'use client';
import * as React from 'react';
import { Button, Input } from '@salon-os/ui';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
}

interface Props {
  formId: string;
  fields: FormField[];
  appointmentId?: string;
  clientToken?: string;
}

const API_URL = typeof window !== 'undefined'
  ? (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000')
  : (process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000');

export function PublicFormClient({ formId, fields, appointmentId, clientToken }: Props): React.JSX.Element {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setAnswer = (id: string, value: unknown) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientToken) headers['authorization'] = `Bearer ${clientToken}`;

      const res = await fetch(`${API_URL}/v1/public/forms/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ formId, appointmentId, answers }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Fehler beim Senden');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerk-Fehler');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-3 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-3xl">
          ✓
        </div>
        <p className="font-display text-lg font-semibold text-text-primary">Formular gesendet</p>
        <p className="text-sm text-text-secondary">
          Danke! Deine Angaben wurden gespeichert.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">
            {field.label}
            {field.required ? <span className="ml-1 text-danger">*</span> : null}
          </label>

          {field.type === 'text' || field.type === 'date' ? (
            <Input
              type={field.type}
              value={(answers[field.id] as string) ?? ''}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              required={field.required}
            />
          ) : field.type === 'textarea' ? (
            <textarea
              value={(answers[field.id] as string) ?? ''}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              required={field.required}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          ) : field.type === 'select' ? (
            <select
              value={(answers[field.id] as string) ?? ''}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              required={field.required}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Bitte wählen…</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(answers[field.id] as boolean) ?? false}
                onChange={(e) => setAnswer(field.id, e.target.checked)}
                required={field.required}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-text-secondary">Ja, ich stimme zu</span>
            </label>
          ) : null}
        </div>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="accent" disabled={saving} className="w-full">
        {saving ? 'Senden…' : 'Formular absenden'}
      </Button>
    </form>
  );
}
