# API Design

## Drei Oberflächen

1. **Internal tRPC** — typed, benutzt vom eigenen Next-Frontend (niemals public)
2. **Public REST API** — versioniert, stabil, OpenAPI 3.1-beschrieben (`/v1/…`)
3. **Public GraphQL API** — für Apps, Partner, komplexe Queries (`/graphql`)

Plus: **Webhooks** (Events an externe Systeme, HMAC-signiert, Retries).

## Auth

- **User-Auth:** WorkOS Session-Cookie (httpOnly, SameSite=Lax, Secure).
- **API-Key-Auth:** `Authorization: Bearer sk_live_…`. Key scopes & tenant-scoped.
- **OAuth 2.0 / OIDC** für Partner-Apps (Refresh-Token, PKCE für Mobile).
- **Rate-Limits:**
  - Free-Tier: 60 req/min
  - Pro: 600 req/min
  - Business: 6.000 req/min
  - Enterprise: verhandelbar (soft + hard limit)

## Versionierung

- `Accept: application/vnd.salon-os.v1+json` oder Pfad `/v1/`.
- Breaking Changes ⇒ neue Major-Version (`/v2/`), alte bleibt ≥ 12 Monate supported.
- Deprecations: `Sunset`-Header + `Deprecation`-Header + Changelog.

## Idempotenz

Alle write-Endpunkte akzeptieren `Idempotency-Key: <uuid>` Header. 24 h Gültigkeit.

## Pagination

Cursor-basiert: `?after=cursor&limit=50`. Antwort hat `{ data:[…], pageInfo:{ endCursor, hasNextPage } }`.

## Filter / Sort

Standardisiert:
- Filter: `?filter[status]=confirmed&filter[startAt][gte]=2026-04-19`
- Sort: `?sort=-startAt` (Minus = desc)
- Sparse-Fields: `?fields=id,startAt,status`

## Fehlerformat (RFC 7807 Problem-Details)

```json
{
  "type": "https://salon-os.com/errors/appointment/conflict",
  "title": "Appointment time conflict",
  "status": 409,
  "detail": "Staff is unavailable at the requested time.",
  "instance": "/v1/appointments",
  "errors": [
    { "path": "startAt", "code": "staff_unavailable" }
  ]
}
```

## REST-Endpunkte (Auszug)

### Auth & Tenants
```
POST   /v1/auth/login
POST   /v1/auth/passkey/register
POST   /v1/auth/passkey/authenticate
GET    /v1/me
GET    /v1/tenants/:tenantId
PATCH  /v1/tenants/:tenantId
```

### Locations
```
GET    /v1/locations
POST   /v1/locations
GET    /v1/locations/:id
PATCH  /v1/locations/:id
DELETE /v1/locations/:id
GET    /v1/locations/:id/opening-hours
PUT    /v1/locations/:id/opening-hours
```

### Services
```
GET    /v1/services
POST   /v1/services
GET    /v1/services/:id
PATCH  /v1/services/:id
DELETE /v1/services/:id
GET    /v1/services/:id/availability?date=2026-04-20&locationId=…
```

### Staff
```
GET    /v1/staff
POST   /v1/staff
GET    /v1/staff/:id
PATCH  /v1/staff/:id
DELETE /v1/staff/:id
GET    /v1/staff/:id/availability?date=YYYY-MM-DD
POST   /v1/staff/:id/shifts
GET    /v1/staff/:id/shifts?from=…&to=…
POST   /v1/staff/:id/timeoff
POST   /v1/staff/:id/clock-in
POST   /v1/staff/:id/clock-out
```

### Clients
```
GET    /v1/clients?search=…
POST   /v1/clients
GET    /v1/clients/:id
PATCH  /v1/clients/:id
DELETE /v1/clients/:id
GET    /v1/clients/:id/appointments
GET    /v1/clients/:id/payments
GET    /v1/clients/:id/forms
GET    /v1/clients/:id/photos
POST   /v1/clients/:id/photos
POST   /v1/clients/:id/gdpr-export
DELETE /v1/clients/:id/gdpr-erase
GET    /v1/clients/merge-candidates
POST   /v1/clients/merge
```

### Appointments
```
GET    /v1/appointments?from=…&to=…&locationId=…&staffId=…
POST   /v1/appointments
GET    /v1/appointments/:id
PATCH  /v1/appointments/:id
POST   /v1/appointments/:id/reschedule
POST   /v1/appointments/:id/confirm
POST   /v1/appointments/:id/check-in
POST   /v1/appointments/:id/start
POST   /v1/appointments/:id/complete
POST   /v1/appointments/:id/cancel
POST   /v1/appointments/:id/no-show
POST   /v1/appointments/quote          # Preisvorschau inkl. Promos
POST   /v1/appointments/availability    # komplexe Verfügbarkeits-Suche
```

### Bookings (Public/Guest)
```
GET    /v1/public/:tenantSlug/locations
GET    /v1/public/:tenantSlug/services
GET    /v1/public/:tenantSlug/services/:serviceId/slots?date=YYYY-MM-DD&locationId=…
POST   /v1/public/:tenantSlug/bookings   # Guest-Buchung (Magic-Link)
GET    /v1/public/bookings/:reference
POST   /v1/public/bookings/:reference/reschedule
POST   /v1/public/bookings/:reference/cancel
```

### Payments
```
POST   /v1/payments/quote                 # Berechnet Summen/Steuer
POST   /v1/payments                       # neue Zahlung (auch Cash)
GET    /v1/payments/:id
POST   /v1/payments/:id/capture
POST   /v1/payments/:id/refund
POST   /v1/payments/:id/receipt           # E-Mail + SMS
POST   /v1/payments/terminal/connection-token
POST   /v1/payments/terminal/collect      # Stripe Terminal
GET    /v1/payments/export?format=csv
GET    /v1/payments/tse-export?from=…&to=…  # DSFinV-K
```

### Products & Inventory
```
GET    /v1/products
POST   /v1/products
GET    /v1/products/:id
PATCH  /v1/products/:id
GET    /v1/products/barcode/:code
POST   /v1/inventory/receive
POST   /v1/inventory/transfer
POST   /v1/inventory/count
GET    /v1/inventory/low-stock
```

### Marketing
```
GET    /v1/campaigns
POST   /v1/campaigns
POST   /v1/campaigns/:id/send
POST   /v1/campaigns/:id/schedule
GET    /v1/campaigns/:id/stats
GET    /v1/segments
POST   /v1/segments
POST   /v1/segments/:id/preview
GET    /v1/templates
POST   /v1/templates
GET    /v1/flows
POST   /v1/flows
POST   /v1/flows/:id/activate
```

### Loyalty / Memberships / Gift Cards
```
GET    /v1/loyalty/program
PUT    /v1/loyalty/program
GET    /v1/clients/:id/loyalty
POST   /v1/clients/:id/loyalty/adjust
GET    /v1/memberships
POST   /v1/memberships
POST   /v1/memberships/:id/subscribe
POST   /v1/memberships/:subId/pause
POST   /v1/memberships/:subId/cancel
GET    /v1/gift-cards
POST   /v1/gift-cards
POST   /v1/gift-cards/:code/redeem
GET    /v1/gift-cards/:code
```

### Reviews & Reputation
```
GET    /v1/reviews
POST   /v1/reviews/respond
POST   /v1/reviews/request    # manuell zu einer Appt.
GET    /v1/reputation/score
GET    /v1/reputation/sources  # Google/Facebook Status
```

### Reports
```
GET    /v1/reports/revenue?from=&to=&groupBy=day
GET    /v1/reports/occupancy
GET    /v1/reports/staff-performance
GET    /v1/reports/retention
GET    /v1/reports/marketing-roi?campaignId=
POST   /v1/reports/schedule   # Scheduled-Report
POST   /v1/reports/ai-query   # Natural-Language AI Analyst
```

### Admin / Webhooks / API-Keys
```
GET    /v1/api-keys
POST   /v1/api-keys
DELETE /v1/api-keys/:id
GET    /v1/webhooks
POST   /v1/webhooks
GET    /v1/webhooks/:id/deliveries
POST   /v1/webhooks/:id/test
```

### AI
```
POST   /v1/ai/chat               # chat with AI Analyst
POST   /v1/ai/recommend-slots
POST   /v1/ai/dynamic-pricing/simulate
POST   /v1/ai/receptionist/webhook   # inbound call/sms gateway
```

## GraphQL-Schema (Auszug)

```graphql
scalar DateTime
scalar Decimal

type Query {
  me: User!
  location(id: ID!): Location
  locations: [Location!]!
  appointments(filter: AppointmentFilter, pagination: PaginationInput): AppointmentConnection!
  client(id: ID!): Client
  clientSearch(query: String!, limit: Int = 10): [Client!]!
  availability(input: AvailabilityInput!): [Slot!]!
  reports: ReportsQuery!
}

type Mutation {
  createAppointment(input: CreateAppointmentInput!): Appointment!
  reschedule(id: ID!, startAt: DateTime!): Appointment!
  cancel(id: ID!, reason: String): Appointment!
  checkIn(id: ID!): Appointment!
  collectPayment(input: CollectPaymentInput!): Payment!
  refundPayment(paymentId: ID!, amount: Decimal!): Payment!
  createClient(input: CreateClientInput!): Client!
  bookPublic(input: PublicBookingInput!): Booking!
}

type Subscription {
  calendarUpdates(locationId: ID!): CalendarEvent!
  paymentUpdates(locationId: ID!): PaymentEvent!
  chatMessage(threadId: ID!): ChatMessage!
}
```

## Webhook-Events

```
appointment.booked
appointment.rescheduled
appointment.cancelled
appointment.checked_in
appointment.completed
appointment.no_show
payment.captured
payment.refunded
client.created
client.updated
client.deleted                  // DSGVO-Löschung
form.submitted
membership.subscribed
membership.cancelled
gift_card.purchased
gift_card.redeemed
review.received
inventory.low_stock
commission.generated
campaign.finished
```

**Delivery:**
- HTTPS, POST, JSON.
- Header `X-SalonOS-Event`, `X-SalonOS-Signature` (HMAC-SHA256), `X-SalonOS-Delivery` (UUID).
- Retries: 0s, 30s, 2m, 10m, 1h, 6h, 24h (max 7 Versuche).
- Dashboard zeigt Deliveries + Replay-Button.

## SDK

- **`@salon-os/sdk`** (TypeScript, autogeneriert aus OpenAPI). Für Node + Browser.
- Python-SDK (autogeneriert) — für Data-Teams.
- Go-SDK (autogeneriert) — für Enterprise-Integrationen.

## Partner-Ökosystem

- **Public App-Marketplace** (nach Phase 3): Partner können Apps listen.
- **Zapier + Make Apps** (offiziell, ab Phase 2).
- **Postman-Collection** + **Insomnia-Collection** veröffentlichen.
- **Sandbox-Environment**: `api.sandbox.salon-os.com` mit reset-bar.
