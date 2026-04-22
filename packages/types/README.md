# @salon-os/types

Shared Zod schemas + TypeScript types across the monorepo.

Hier leben:

- **Primitives** — UUID, ISO-Datetime, Currency-Code, Money.
- **API-Contracts** — Pagination, Fehler-Format (RFC 7807 Problem Details).
- **Domain-Schemas** (ab Phase 1) — Booking, Client, Appointment, Payment, … mit Zod.

**Regel:** Wenn zwei Pakete dasselbe Schema brauchen → hierher.
Kein Copy-Paste, keine manuellen Types, die das Zod-Schema duplizieren.
Immer `z.infer<typeof schema>` nutzen.
