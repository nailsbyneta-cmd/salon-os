import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  bookedVia: string;
  staffId: string;
  staff: { firstName: string; lastName: string };
  client: { firstName: string; lastName: string; email: string | null } | null;
  items: Array<{ price: string; duration: number; service: { name: string } }>;
  tipAmount: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
}

const PERIODS: Record<string, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request): Promise<Response> {
  const ctx = await getCurrentTenant();
  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? '30d';
  const days = PERIODS[period] ?? 30;

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );

    const headers = [
      'Datum',
      'Zeit',
      'Kundin',
      'Email',
      'Mitarbeiterin',
      'Services',
      'Dauer (Min)',
      'Umsatz (CHF)',
      'Trinkgeld (CHF)',
      'Zahlungsart',
      'Status',
      'Buchungskanal',
      'Bezahlt am',
      'Appointment-ID',
    ];
    const rows = res.appointments
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .map((a) => {
        const date = new Date(a.startAt);
        const services = a.items.map((i) => i.service.name).join(' · ');
        const duration = a.items.reduce((s, i) => s + i.duration, 0);
        const revenue =
          a.status === 'CANCELLED' || a.status === 'NO_SHOW'
            ? 0
            : a.items.reduce((s, i) => s + Number(i.price), 0);
        const clientName = a.client ? `${a.client.firstName} ${a.client.lastName}` : 'Blockzeit';
        return [
          date.toLocaleDateString('de-CH'),
          date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
          clientName,
          a.client?.email ?? '',
          `${a.staff.firstName} ${a.staff.lastName}`,
          services,
          duration,
          revenue.toFixed(2),
          a.tipAmount ? Number(a.tipAmount).toFixed(2) : '',
          a.paymentMethod ?? '',
          a.status,
          a.bookedVia,
          a.paidAt ? new Date(a.paidAt).toLocaleDateString('de-CH') : '',
          a.id,
        ]
          .map(csvEscape)
          .join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `salon-os-report-${period}-${to.toISOString().slice(0, 10)}.csv`;
    return new NextResponse('\uFEFF' + csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.problem?.title ?? 'Export fehlgeschlagen' },
        { status: err.status },
      );
    }
    throw err;
  }
}
