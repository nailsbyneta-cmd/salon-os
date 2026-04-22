import Link from 'next/link';
import { Card, CardBody } from '@salon-os/ui';
import { ImportForm } from './import-form';

export default function ClientsImportPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <header className="mb-6">
        <Link href="/clients" className="text-xs text-text-muted hover:text-text-primary">
          ← Kundinnen
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Migration
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          CSV importieren
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Von Phorest, Fresha, Booksy, Mangomint oder Timely? Exportiere dort eine CSV und lade sie
          hier hoch. Existierende Emails werden übersprungen — kein Duplikat-Chaos.
        </p>
      </header>

      <Card className="mb-4" elevation="flat">
        <CardBody className="text-xs text-text-secondary">
          <div className="mb-2 font-medium text-text-primary">Unterstützte Spalten</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {[
              ['firstName', 'vorname, first'],
              ['lastName', 'nachname, last, surname'],
              ['email', 'emailadresse'],
              ['phone', 'mobile, telefon, handy'],
              ['birthday', 'dob, geburtstag'],
              ['notes', 'notizen'],
              ['tags', 'tags (komma-getrennt)'],
            ].map(([k, alt]) => (
              <div key={k}>
                <code className="rounded bg-surface-raised px-1.5 py-0.5 text-[11px]">{k}</code>
                <div className="mt-0.5 text-[10px] text-text-muted">{alt}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-text-muted">
            Datum: <code>YYYY-MM-DD</code>, <code>DD.MM.YYYY</code> oder
            <code> DD/MM/YYYY</code>. Pflicht: firstName + lastName.
          </div>
        </CardBody>
      </Card>

      <ImportForm />
    </div>
  );
}
