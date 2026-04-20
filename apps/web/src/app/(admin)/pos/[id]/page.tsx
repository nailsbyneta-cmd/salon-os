import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Card, CardBody, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { PosForm } from './pos-form';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  tipAmount: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{
    id: string;
    price: string;
    duration: number;
    service: { name: string };
  }>;
}

async function loadAppointment(id: string): Promise<Appt | null> {
  const ctx = getCurrentTenant();
  try {
    return await apiFetch<Appt>(`/v1/appointments/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function PosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const a = await loadAppointment(id);
  if (!a) notFound();

  const subtotal = a.items.reduce((s, i) => s + Number(i.price), 0);
  const name = a.client
    ? `${a.client.firstName} ${a.client.lastName}`
    : 'Blockzeit';
  const already = a.paidAt !== null;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={`/calendar/${a.id}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zum Termin
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Kassieren
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {new Date(a.startAt).toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}{' '}
          ·{' '}
          {new Date(a.startAt).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </header>

      <Card className="mb-6">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Leistungen
          </h2>
        </div>
        <ul>
          {a.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between border-b border-border px-5 py-3 text-sm last:border-0"
            >
              <div>
                <div className="font-medium text-text-primary">{i.service.name}</div>
                <div className="text-xs text-text-muted">{i.duration} Min</div>
              </div>
              <PriceDisplay amount={i.price} />
            </li>
          ))}
          <li className="flex items-center justify-between bg-surface-raised px-5 py-3 text-sm">
            <span className="font-semibold text-text-primary">Zwischensumme</span>
            <PriceDisplay amount={subtotal} size="lg" />
          </li>
        </ul>
      </Card>

      <Card>
        <CardBody>
          <div className="mb-4 flex items-center gap-3">
            <Avatar
              name={`${a.staff.firstName} ${a.staff.lastName}`}
              color={a.staff.color}
              size="md"
            />
            <div>
              <div className="text-sm font-medium text-text-primary">
                Kassiert wird bei {a.staff.firstName}
              </div>
              <div className="text-xs text-text-muted">
                Trinkgeld geht direkt an sie.
              </div>
            </div>
          </div>

          {already ? (
            <div className="rounded-md border border-success bg-success/5 p-4 text-center">
              <Badge tone="success" dot>
                Bezahlt
              </Badge>
              <p className="mt-3 text-sm text-text-secondary">
                Am{' '}
                {new Date(a.paidAt ?? '').toLocaleString('de-CH', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}{' '}
                via {a.paymentMethod}. Trinkgeld{' '}
                <strong>{Number(a.tipAmount ?? 0).toFixed(2)} CHF</strong>.
              </p>
            </div>
          ) : (
            <PosForm appointmentId={a.id} subtotal={subtotal} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
