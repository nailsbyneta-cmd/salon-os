import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Admin-Zugangs-Gate. Zwei gültige Wege:
 *
 *   1. `salon_session`-Cookie vorhanden   → pass (WorkOS-Magic-Link-Flow)
 *   2. HTTP Basic-Auth stimmt             → pass (Dev/Staging-Fallback
 *                                            solange WorkOS nicht überall aktiv)
 *
 * Wichtig: Middleware läuft in Next's Edge-Runtime — keine `node:crypto`-
 * Primitives. Die kryptographische Session-Verifikation passiert in der
 * API (`apps/api/src/tenant/tenant.middleware.ts`), das Middleware prüft
 * hier nur Cookie-Präsenz. Das reicht, um Bot-/Direct-Traffic fernzuhalten;
 * jeder Datenzugriff wird vom API nochmals gegen das signierte Token geprüft.
 *
 * Wenn weder ADMIN_USERNAME/PASSWORD noch Cookie vorhanden sind UND beide
 * env-Vars fehlen, bleibt der Dev-Fallback offen (lokale Entwicklung ohne
 * Auth-Setup).
 */
const SESSION_COOKIE = 'salon_session';

export function middleware(req: NextRequest): NextResponse {
  // Pfad 1: gültige Session-Cookie → durchlassen.
  if (req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  // Pfad 2: Basic-Auth gesetzt?
  const user = process.env['ADMIN_USERNAME'];
  const pass = process.env['ADMIN_PASSWORD'];
  if (!user || !pass) {
    // Weder Cookie noch Basic-Auth-Creds konfiguriert → Dev-Fallback,
    // Middleware greift nicht ein.
    return NextResponse.next();
  }

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
  matcher: [
    /*
     * Match all paths except:
     * - /book/... (public booking)
     * - /login/... (WorkOS-Magic-Link-Login — muss ohne Auth erreichbar sein)
     * - /m/... (mobile PWA, eigenes Auth kommt später)
     * - /api/... (API-Routes — Next.js internal + exports)
     * - /appointment/... (self-service via HMAC-Token)
     * - /_next/ (next internals)
     * - /favicon, /robots, /icon, /apple-icon, /manifest.webmanifest
     * - /opengraph-image, /sitemap.xml, statische Assets
     */
    '/((?!book|login|m|api|appointment|_next/static|_next/image|favicon|robots|icon|apple-icon|manifest.webmanifest|opengraph-image|sitemap).*)',
  ],
};
