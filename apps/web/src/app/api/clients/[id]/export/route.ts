import { NextResponse } from 'next/server';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

/**
 * Proxy-Route: lädt den DSGVO-Export vom API und streamt ihn als
 * JSON-Download. Admin-Auth via x-tenant-id Header (Phase 0).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const ctx = await getCurrentTenant();
  try {
    const data = await apiFetch<unknown>(`/v1/clients/${id}/export`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    const body = JSON.stringify(data, null, 2);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="client-${id}-export.json"`,
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
