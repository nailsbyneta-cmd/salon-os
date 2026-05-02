'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Input } from '@salon-os/ui';
import { createForm, updateForm } from './actions';

type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'date';

interface Field {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Kurztext' },
  { value: 'textarea', label: 'Langtext' },
  { value: 'select', label: 'Auswahl' },
  { value: 'checkbox', label: 'Checkbox (Ja/Nein)' },
  { value: 'date', label: 'Datum' },
];

function newField(): Field {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '' };
}

interface Props {
  initial?: {
    id: string;
    name: string;
    description: string | null;
    fields: Array<{
      id: string;
      label: string;
      type: FieldType;
      required: boolean;
      options?: string[];
    }>;
    active: boolean;
  };
}

export function FormBuilderClient({ initial }: Props): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? '');
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [fields, setFields] = React.useState<Field[]>(
    initial?.fields.map((f) => ({
      ...f,
      options: (f.options ?? []).join('\n'),
    })) ?? [newField()],
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addField = () => setFields((prev) => [...prev, newField()]);
  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));
  const updateField = (id: string, patch: Partial<Field>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name ist Pflicht');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options:
            f.type === 'select'
              ? f.options
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean)
              : undefined,
        })),
      };
      if (initial) {
        await updateForm(initial.id, payload);
      } else {
        await createForm(payload);
      }
      router.push('/forms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Formular-Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Vorab-Anamnese Haarbehandlung"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Beschreibung
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Erklärung für die Kundin"
            />
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Felder</h2>
          <Button type="button" variant="ghost" size="sm" onClick={addField}>
            + Feld hinzufügen
          </Button>
        </div>

        {fields.map((field, idx) => (
          <Card key={field.id} elevation="flat" className="border border-border">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent/10 text-xs font-semibold text-accent">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Frage oder Label"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveField(field.id, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(field.id, 1)}
                    disabled={idx === fields.length - 1}
                    className="rounded p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="rounded p-1 text-text-muted hover:text-danger"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    className="accent-accent"
                  />
                  Pflichtfeld
                </label>
              </div>

              {field.type === 'select' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Optionen (eine pro Zeile)
                  </label>
                  <textarea
                    value={field.options}
                    onChange={(e) => updateField(field.id, { options: e.target.value })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? 'Speichern…' : initial ? 'Aktualisieren' : 'Formular erstellen'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/forms')}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
