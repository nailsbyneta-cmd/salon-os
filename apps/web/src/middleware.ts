import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@salon-os/auth';

/**
 * Auth-Middleware für Admin-Bereich.
 *
 * Verhalten (toggled via env):
 *  - WORKOS_AUTH_ENABLED=true  → wenn kein `salon_session` Cookie → /login
 *  - sonst (Dev): Pass-through (DEMO_TENANT_ID Modus)
 *
 * Wir UNSEAL den Cookie hier nicht (Edge-Runtime kann's, aber wir wollen
 * die volle Validation in Server-Components — dort fängt UnauthenticatedError
 * den Edge-Case "Cookie da aber expired" ab und Re-Direct erfolgt im handler).
 *
 * Public-Booking, mobile PWA, /login, /api/public/* bleiben offen.
 */
export function middleware(req: NextRequest): NextResponse {
  const enabled = process.env['WORKOS_AUTH_ENABLED'] === 'true';
  if (!enabled) return NextResponse.next();

  const sealed = req.cookies.get(COOKIE_NAME)?.value;
  if (sealed) return NextResponse.next();

  const url = req.nextUrl.clone();
  const redirectTo = `${url.pathname}${url.search}`;
  url.pathname = '/login';
  url.searchParams.set('redirect', redirectTo);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /book/... (public booking)
     * - /m/... (mobile PWA, eigenes Auth später)
     * - /appointment/... (HMAC-Token self-service)
     * - /login (sich selbst nicht abfangen!)
     * - /_next, statische Assets
     */
    '/((?!book|m|appointment|login|_next/static|_next/image|favicon|robots|icon|apple-icon|manifest.webmanifest|opengraph-image|sitemap).*)',
  ],
};
