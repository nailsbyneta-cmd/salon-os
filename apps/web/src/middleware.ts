import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Minimal-Schutz für die Admin-Oberfläche bis WorkOS-Auth steht.
 * HTTP Basic-Auth via ADMIN_USERNAME + ADMIN_PASSWORD env-vars.
 * Wenn Vars leer sind → Auth deaktiviert (Dev-Fallback).
 *
 * Public-Booking, Mobile-App-Shell unter /m, API-Health bleiben offen.
 */
export function middleware(req: NextRequest): NextResponse {
  const user = process.env['ADMIN_USERNAME'];
  const pass = process.env['ADMIN_PASSWORD'];
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const sep = decoded.indexOf(':');
      const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
      const p = sep >= 0 ? decoded.slice(sep + 1) : '';
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SALON OS Admin"',
    },
  });
}

export const config = {
  // Match admin-Routen — also alles außer (booking), /m, /api, /_next, etc.
  matcher: [
    /*
     * Match all paths except:
     * - /book/... (public booking)
     * - /login/... (WorkOS-Magic-Link-Login — muss ohne Basic-Auth erreichbar sein)
     * - /m/... (mobile PWA, braucht später eigenes Auth)
     * - /api/... (API-Routes — Next.js internal + exports)
     * - /appointment/... (self-service via HMAC-Token)
     * - /_next/ (next internals)
     * - /favicon, /robots, /icon, /apple-icon, /manifest.webmanifest
     * - /opengraph-image, /sitemap.xml, statische Assets
     */
    '/((?!book|login|m|api|appointment|_next/static|_next/image|favicon|robots|icon|apple-icon|manifest.webmanifest|opengraph-image|sitemap).*)',
  ],
};
