import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'salon_customer_session';
const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

/**
 * DSGVO-Daten-Export-Route. Liest Session-Cookie, ruft API mit Bearer auf,
 * streamt JSON als Download zurück. Browser triggert "Speichern unter…".
 *
 * Direktes Verlinken auf API-Endpoint ginge nicht weil HTTP-only-Cookie
 * nicht zur API-Origin geschickt wird.
 */
export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/v1/public/me/export`, {
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'export failed' }, { status: res.status });
    }
    const data = await res.json();
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="meine-daten-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'network' }, { status: 502 });
  }
}
