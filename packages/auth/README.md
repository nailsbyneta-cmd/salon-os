# @salon-os/auth

WorkOS-Auth-Integration + Session-Handling.

## Aktuell (Phase 0)

- Zod-Schema für `Session`-Objekt
- `isManager()` / `isOwner()` Role-Check-Helper

## Nächste Schritte (Phase 0 Ende → Phase 1)

- WorkOS-Client initialisieren mit `WORKOS_API_KEY`
- Login-Flow: `/auth/login` → WorkOS AuthKit → Callback → Session-Cookie
- Passkeys-Enrollment
- SSO für Enterprise-Tenants (SAML, OIDC)
- MFA für Medspa-Tenants
- Session-Middleware für NestJS (`apps/api`) + Next.js (`apps/web`)

Siehe [specs/tech-stack.md](../../specs/tech-stack.md#auth).
