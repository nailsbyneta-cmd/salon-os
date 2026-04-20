import { notFound } from 'next/navigation';
import { Badge, Card, CardBody } from '@salon-os/ui';
import { SelfServiceActions } from '@/components/self-service-actions';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ApptData {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string };
  items: Array<{ service: { name: string } }>;
  tenant: { name: string; slug: string; timezone: string };
  location: { name: string };
  action: 'cancel' | 'reschedule';
}

async function loadAppt(id: string, token: string): Promise<ApptData | null> {
  try {
    const res = await fetch(
      `${API_URL}/v1/public/appointments/${id}?t=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return (await res.json()) as ApptData;
  } catch {
    return null;
  }
}

const statusLabel: Record<string, string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'Bestätigt',
  CHECKED_IN: 'Eingecheckt',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'Nicht erschienen',
  WAITLIST: 'Warteliste',
};

export default async function SelfServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();

  const appt = await loadAppt(id, t);
  if (!appt) {
    return (
      <main className="space-y-6 text-center">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Termin
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold">
            Link abgelaufen
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Dieser Link ist ungültig oder abgelaufen. Kontaktiere uns bitte direkt,
            wenn du deinen Termin ändern möchtest.
          </p>
        </header>
      </main>
    );
  }

  const services = appt.items.map((i) => i.service.name).join(', ');
  const when = new Date(appt.startAt).toLocaleString('de-CH', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });
  const staffName = `${appt.staff.firstName} ${appt.staff.lastName}`;
  const isCancelled = appt.status === 'CANCELLED' || appt.status === 'NO_SHOW';

  return (
    <main className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Dein Termin
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          {appt.tenant.name}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{appt.location.name}</p>
      </header>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Termin
              </p>
              <p className="mt-1 text-base font-medium text-text-primary">{when}</p>
            </div>
            <Badge
              tone={
                isCancelled
                  ? 'danger'
                  : appt.status === 'COMPLETED'
                    ? 'neutral'
                    : 'success'
              }
              dot
            >
              {statusLabel[appt.status] ?? appt.status}
            </Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Leistung
              </dt>
              <dd className="mt-1 text-text-primary">{services}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Bei
              </dt>
              <dd className="mt-1 text-text-primary">{staffName}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {isCancelled ? (
        <div className="text-center text-sm text-text-secondary">
          Dieser Termin wurde bereits storniert. Bis bald!
        </div>
      ) : (
        <SelfServiceActions
          appointmentId={appt.id}
          token={t}
          action={appt.action}
        />
      )}

      <footer className="pt-4 text-center text-[11px] tracking-wider text-text-muted">
        Powered by <span className="font-semibold">SALON OS</span>
      </footer>
    </main>
  );
}
