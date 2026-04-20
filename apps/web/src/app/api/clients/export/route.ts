import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  tags: string[];
  emailOptIn: boolean;
  smsOptIn: boolean;
  createdAt: string;
}

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(): Promise<Response> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: Client[] }>('/v1/clients?limit=5000', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    const rows = [
      [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'birthday',
        'lastVisitAt',
        'totalVisits',
        'tags',
        'emailOptIn',
        'smsOptIn',
        'createdAt',
      ].join(','),
      ...res.clients.map((c) =>
        [
          c.id,
          csvEscape(c.firstName),
          csvEscape(c.lastName),
          csvEscape(c.email),
          csvEscape(c.phone),
          csvEscape(c.birthday?.slice(0, 10)),
          csvEscape(c.lastVisitAt),
          String(c.totalVisits),
          csvEscape(c.tags.join('; ')),
          String(c.emailOptIn),
          String(c.smsOptIn),
          csvEscape(c.createdAt),
        ].join(','),
      ),
    ];
    const csv = '\uFEFF' + rows.join('\n') + '\n'; // BOM für Excel
    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="clients-${today}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem ?? { error: err.message }, {
        status: err.status,
      });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
