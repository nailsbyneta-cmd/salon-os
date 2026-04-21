import Link from 'next/link';
import { ClientForm } from '@/components/client-form';
import { createClient } from '../actions';

export default function NewClientPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/clients"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Kundinnen
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          CRM
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Neue Kundin
        </h1>
      </header>
      <ClientForm action={createClient} mode="create" cancelHref="/clients" />
    </div>
  );
}
