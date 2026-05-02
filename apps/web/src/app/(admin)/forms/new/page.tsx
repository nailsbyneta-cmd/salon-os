import * as React from 'react';
import Link from 'next/link';
import { FormBuilderClient } from '../form-builder-client';

export default function NewFormPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link href="/forms" className="text-xs text-text-muted hover:text-text-primary">
        ← Formulare
      </Link>
      <header className="mt-4 mb-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Neu</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Neues Formular erstellen
        </h1>
      </header>
      <FormBuilderClient />
    </div>
  );
}
