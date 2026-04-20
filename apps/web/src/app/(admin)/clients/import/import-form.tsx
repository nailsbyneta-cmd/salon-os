'use client';

import { useState, useTransition } from 'react';
import { Button, Card, CardBody } from '@salon-os/ui';
import { runImport } from './actions';

interface ImportResult {
  ok: boolean;
  created?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
  message?: string;
}

export function ImportForm(): React.JSX.Element {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsv((reader.result ?? '').toString());
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleSubmit(form: FormData): void {
    startTransition(async () => {
      const res = await runImport(form);
      setResult(res);
    });
  }

  const lineCount = csv
    ? csv.split(/\r?\n/).filter((l) => l.trim()).length - 1
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              CSV-Datei hochladen
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-foreground hover:file:bg-brand/90"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-x-0 -top-3 flex justify-center">
              <span className="bg-surface px-2 text-[10px] uppercase tracking-wider text-text-muted">
                oder einfügen
              </span>
            </div>
            <div className="h-px bg-border" />
          </div>
          <form action={handleSubmit} className="space-y-3">
            <textarea
              name="csv"
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setResult(null);
              }}
              rows={10}
              placeholder="firstName,lastName,email,phone,birthday,notes,tags&#10;Anna,Müller,anna@example.ch,+41 79 123 45 67,1990-05-12,VIP-Kundin,vip;stammkundin"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {lineCount > 0
                  ? `${lineCount} Zeile${lineCount === 1 ? '' : 'n'} (inkl. ungültige)`
                  : 'Erste Zeile = Header, Pflichtfelder: firstName + lastName'}
              </p>
              <Button
                type="submit"
                variant="primary"
                disabled={!csv.trim() || isPending}
              >
                {isPending ? 'Importiere …' : 'Importieren'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result ? (
        <Card
          className={
            result.ok
              ? 'border-success/40 bg-success/5'
              : 'border-danger/40 bg-danger/5'
          }
        >
          <CardBody className="space-y-2">
            {result.ok ? (
              <>
                <div className="text-sm font-semibold text-text-primary">
                  ✓ Import abgeschlossen
                </div>
                <div className="text-sm text-text-secondary">
                  <strong>{result.created}</strong> neue Kundinnen angelegt
                  {result.skipped ? (
                    <>
                      , <strong>{result.skipped}</strong> übersprungen (Email
                      bereits vorhanden oder Daten unvollständig)
                    </>
                  ) : null}
                  .
                </div>
                {result.errors && result.errors.length > 0 ? (
                  <details className="text-xs text-text-muted">
                    <summary className="cursor-pointer">
                      {result.errors.length} Fehler beim Anlegen
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono">
                      {result.errors.slice(0, 20).map((e) => (
                        <li key={e.row}>
                          Zeile {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <a
                  href="/clients"
                  className="inline-block text-xs font-medium text-accent hover:underline"
                >
                  → Zur Kundenliste
                </a>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-danger">
                  ✗ Import fehlgeschlagen
                </div>
                <div className="text-sm text-text-secondary">
                  {result.message}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
