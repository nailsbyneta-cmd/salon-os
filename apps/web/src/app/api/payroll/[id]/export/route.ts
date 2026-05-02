import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await getCurrentTenant();
  const apiUrl = process.env['API_URL'] ?? process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

  const resp = await fetch(`${apiUrl}/v1/payroll/${id}/export`, {
    headers: {
      'x-tenant-id': ctx.tenantId,
      'x-user-id': ctx.userId,
      'x-role': ctx.role,
    },
  });

  if (!resp.ok) {
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: resp.status });
  }

  const csv = await resp.text();
  const disposition =
    resp.headers.get('content-disposition') ?? `attachment; filename="lohnabrechnung-${id}.csv"`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': disposition,
    },
  });
}
