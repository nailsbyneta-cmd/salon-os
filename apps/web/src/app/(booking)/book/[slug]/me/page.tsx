import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Badge, Button, Card, CardBody } from '@salon-os/ui';
import { cancelMyAppointment, deleteMyAccount, logout } from './actions';

const COOKIE_NAME = 'salon_customer_session';
const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Profile {
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  appointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    staff: { firstName: string };
    location: { name: string };
    items: Array<{
      price: string;
      duration: number;
      service: { name: string };
      optionLabels: string[];
    }>;
  }>;
}

async function loadProfile(sessionToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/me/profile`, {
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
}

function statusLabel(s: string): {
  label: string;
  tone: 'accent' | 'success' | 'warning' | 'neutral';
} {
  switch (s) {
    case 'BOOKED':
    case 'CONFIRMED':
      return { label: 'Bestätigt', tone: 'accent' };
    case 'CHECKED_IN':
    case 'IN_SERVICE':
      return { label: 'Im Gange', tone: 'warning' };
    case 'COMPLETED':
      return { label: 'Erledigt', tone: 'success' };
    case 'CANCELLED':
      return { label: 'Storniert', tone: 'neutral' };
    case 'NO_SHOW':
      return { label: 'Nicht erschienen', tone: 'neutral' };
    default:
      return { label: s, tone: 'neutral' };
  }
}

export default async function MePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cancelled?: string; 'cancel-error'?: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect(`/book/${slug}/me/login`);
  }

  const profile = await loadProfile(sessionToken);
  if (!profile) {
    // Cookie kaputt oder Session abgelaufen
    redirect(`/book/${slug}/me/login`);
  }

  const now = Date.now();
  const upcoming = profile.appointments.filter((a) => new Date(a.startAt).getTime() >= now);
  const past = profile.appointments.filter((a) => new Date(a.startAt).getTime() < now);

  const fullName = `${profile.client.firstName} ${profile.client.lastName}`.trim();
  const cancelError = sp['cancel-error'];

  return (
    <main className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Mein Konto
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Hallo {profile.client.firstName}
          </h1>
        </div>
        <form action={logout.bind(null, slug)}>
          <Button type="submit" variant="ghost" size="sm">
            Abmelden
          </Button>
        </form>
      </header>

      {/* Profil-Box */}
      <Card>
        <CardBody className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Profil</p>
          <p className="font-display text-base font-semibold text-text-primary">{fullName}</p>
          {profile.client.email ? (
            <p className="text-sm text-text-secondary">{profile.client.email}</p>
          ) : null}
          {profile.client.phone ? (
            <p className="text-sm text-text-secondary">{profile.client.phone}</p>
          ) : null}
        </CardBody>
      </Card>

      {/* Cancel-Confirmation oder Error-Banner */}
      {sp.cancelled ? (
        <div
          role="status"
          className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ✓ Termin storniert.
        </div>
      ) : null}
      {cancelError ? (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {cancelError}
        </div>
      ) : null}

      {/* Bevorstehende Termine */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Bevorstehende Termine ({upcoming.length})
        </p>
        {upcoming.length === 0 ? (
          <Card elevation="flat">
            <CardBody className="space-y-2 py-8 text-center">
              <p className="text-sm text-text-secondary">Noch keine Termine bevorstehend.</p>
              <Link href={`/book/${slug}`}>
                <Button variant="accent">Termin buchen</Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <AppointmentCard key={a.id} appt={a} slug={slug} canCancel />
            ))}
          </div>
        )}
      </section>

      {/* Vergangene Termine */}
      {past.length > 0 ? (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Vergangene Termine ({past.length})
          </p>
          <div className="space-y-2">
            {past.map((a) => (
              <AppointmentCard key={a.id} appt={a} slug={slug} canCancel={false} />
            ))}
          </div>
        </section>
      ) : null}

      {/* DSGVO-Selbst-Service: Daten-Export + Account-Löschung */}
      <section className="border-t border-border pt-6">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          Datenschutz
        </p>
        <Card elevation="flat">
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-text-primary">
                  Meine Daten herunterladen
                </p>
                <p className="text-xs text-text-secondary">
                  Alle Daten als JSON-Datei. Recht auf Auskunft (Art. 15 DSGVO / Art. 25 DSG).
                </p>
              </div>
              <a
                href={`/book/${slug}/me/export`}
                download
                className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-all hover:border-accent/50 hover:shadow-sm"
              >
                📥 Herunterladen
              </a>
            </div>
            <div className="border-t border-border pt-3">
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-medium text-danger hover:underline [&::-webkit-details-marker]:hidden">
                  🗑 Account löschen…
                </summary>
                <div className="mt-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-text-secondary">
                  <p>
                    Deine Daten werden sofort markiert und nach 30 Tagen endgültig gelöscht.
                    Vergangene Termine können wegen gesetzlicher Aufbewahrungspflicht (Buchhaltung)
                    pseudonymisiert erhalten bleiben.
                  </p>
                  <form action={deleteMyAccount.bind(null, slug)} className="mt-3">
                    <button
                      type="submit"
                      className="rounded-md bg-danger px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-danger/90 active:scale-[0.98]"
                    >
                      Ja, Account jetzt löschen
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </CardBody>
        </Card>
      </section>

      <div className="text-center">
        <Link
          href={`/book/${slug}`}
          className="text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          ← Zur Service-Übersicht
        </Link>
      </div>
    </main>
  );
}

function AppointmentCard({
  appt,
  slug,
  canCancel,
}: {
  appt: Profile['appointments'][number];
  slug: string;
  canCancel: boolean;
}): React.JSX.Element {
  const dt = new Date(appt.startAt);
  const dateStr = dt.toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const timeStr = dt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  const status = statusLabel(appt.status);
  const total = appt.items.reduce((s, i) => s + Number(i.price), 0);
  // Stornieren erlaubt nur ≥ 2h vor Termin + Status BOOKED/CONFIRMED
  const minLeadMs = 2 * 60 * 60_000;
  const cancellable =
    canCancel &&
    (appt.status === 'BOOKED' || appt.status === 'CONFIRMED') &&
    dt.getTime() - Date.now() >= minLeadMs;

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-base font-semibold text-text-primary">
            {dateStr} · {timeStr}
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <ul className="space-y-1 text-sm text-text-secondary">
          {appt.items.map((i, idx) => {
            const labels = (i.optionLabels ?? []).filter(Boolean);
            return (
              <li key={idx}>
                {i.service.name}
                {labels.length > 0 ? (
                  <span className="ml-2 text-xs text-accent">{labels.join(' · ')}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            bei {appt.staff.firstName} · {appt.location.name}
          </span>
          <span className="tabular-nums">CHF {total.toFixed(2).replace(/\.00$/, '')}</span>
        </div>
        {cancellable ? (
          <div className="border-t border-border pt-2">
            <form action={cancelMyAppointment.bind(null, slug, appt.id)}>
              <button
                type="submit"
                className="text-xs text-text-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Termin stornieren
              </button>
            </form>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
