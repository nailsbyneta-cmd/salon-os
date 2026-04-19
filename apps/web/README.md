# @salon-os/web

Next.js 15 Frontend für SALON OS. Enthält:
- **Admin-Dashboard** (Owner/Manager)
- **Staff-Desktop-View** (Kalender, POS, Kunden am Desktop/Tablet)
- **Branded Booking-Pages** unter `book.{tenant-slug}.salon-os.com`

Der Consumer-Marktplatz (`salon-os.com`) ist eine separate App (kommt in Phase 3).

## Stack

- Next.js 15 (App Router, React Server Components)
- React 19
- Tailwind CSS 4
- TanStack Query für Server-State
- Zod + React Hook Form
- `@salon-os/ui` für shared shadcn-Komponenten

## Lokal laufen lassen

```bash
pnpm db:up                       # aus Repo-Root
pnpm --filter @salon-os/web dev
```

Offen: `http://localhost:3000`.

## Struktur

```
src/
└── app/
    ├── layout.tsx    # Root-Layout (html, body, globals.css)
    ├── page.tsx      # Phase-0 Startseite (stub)
    └── globals.css   # Tailwind-Import
```

Wird in Phase 1 um `(admin)/`, `(staff)/`, `(booking)/`-Route-Groups erweitert.
