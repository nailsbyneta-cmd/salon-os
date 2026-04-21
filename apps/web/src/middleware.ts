import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Minimal-Schutz für die Admin-Oberfläche bis WorkOS-Auth steht.
 * HTTP Basic-Auth via ADMIN_USERNAME + ADMIN_PASSWORD env-vars.
 * Wenn Vars leer sind → Auth deaktiviert (Dev-Fallback).
 *
 * Public-Booking, Mobile-App-Shell unter /m, API-Health bleiben offen.
 */
function unauthorized(): NextResponse {
  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="SALON OS Admin"' },
  });
}

export function middleware(req: NextRequest): NextResponse {
  const user = process.env['ADMIN_USERNAME'];
  const pass = process.env['ADMIN_PASSWORD'];
  const isProd = process.env['NODE_ENV'] === 'production';

  // In Prod: ohne Auth-Credentials → fail-closed. Lieber 503 als offenes Admin.
  if (!user || !pass) {
    if (isProd) return unauthorized();
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization');
  // Längen-Bound gegen oversized-header abuse.
  if (auth && auth.length < 4096 && auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const sep = decoded.indexOf(':');
      const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
      const p = sep >= 0 ? decoded.slice(sep + 1) : '';
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      /* fall through */
    }
  }

  return unauthorized();
}

export const config = {
  // Match admin-Routen. /api/* (Admin-Proxy-Exports: Clients-CSV, Reports-CSV)
  // bleibt geschützt. /api/public/* wäre ausgenommen, existiert aber nicht
  // im Web (Public-Endpoints laufen auf NestJS-API).
  matcher: [
    /*
     * Match all paths except:
     * - /book/... (public booking)
     * - /m/... (mobile PWA, braucht später eigenes Auth)
     * - /appointment/... (self-service via HMAC-Token)
     * - /_next/ (next internals)
     * - /favicon, /robots, /icon, /apple-icon, /manifest.webmanifest
     * - /opengraph-image, /sitemap.xml, statische Assets
     */
    '/((?!book|m|appointment|_next/static|_next/image|favicon|robots|icon|apple-icon|manifest.webmanifest|opengraph-image|sitemap).*)',
  ],
};
