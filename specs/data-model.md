# Data Model (Postgres 16 + Prisma)

> Alle Tabellen haben zusätzlich: `id UUID PRIMARY KEY`, `tenant_id UUID NOT NULL`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ` (Soft-Delete). `tenant_id` ist durch **RLS-Policies** isoliert.

## 1. Core-Entitäten (Übersicht)

```
Tenant 1───N Location
Location 1───N Staff
Tenant 1───N Service (Katalog global), Location 1───N ServiceVariant (Override pro Location)
Tenant 1───N Client
Client 1───N Appointment N───1 Staff, 1───1 Service, 1───1 Location
Appointment 1───N AppointmentItem (Service-Positionen)
Appointment 1───1 Payment 1───N PaymentItem
Tenant 1───N Product N───N Location (ProductStock)
Appointment 1───N ProductUsed (Backbar)
Staff 1───N Shift, 1───N TimeClock
Client 1───N FormSubmission
Client 1───N Photo (Before/After)
Client 1───N LoyaltyBalance
Tenant 1───N Membership Plan, Client 1───N ClientMembership
Tenant 1───N GiftCard → Client 1───N GiftCardRedemption
Tenant 1───N Campaign, Campaign 1───N Message
Tenant 1───N Review (aggregated)
Tenant 1───N Webhook, 1───N ApiKey, 1───N Integration
```

## 2. Prisma-Schema (Auszug — vollständig in `packages/db/schema.prisma`)

```prisma
// ============ Multi-Tenancy ============

model Tenant {
  id               String    @id @default(uuid())
  slug             String    @unique
  name             String
  legalName        String?
  countryCode      String    // ISO 3166 alpha-2
  currency         String    // ISO 4217
  timezone         String    // IANA (e.g. Europe/Berlin)
  locale           String    // e.g. de-DE
  vatId            String?
  plan             Plan      @default(STARTER)
  status           TenantStatus @default(TRIAL)
  billingEmail     String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  locations        Location[]
  staff            Staff[]
  services         Service[]
  clients          Client[]
  appointments     Appointment[]
  products         Product[]
  // ... weitere Relations
}

enum Plan {
  STARTER
  PRO
  BUSINESS
  ENTERPRISE
  MEDSPA
}

enum TenantStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  SUSPENDED
}

// ============ Locations ============

model Location {
  id               String    @id @default(uuid())
  tenantId         String
  name             String
  slug             String
  address1         String?
  address2         String?
  city             String?
  postalCode       String?
  region           String?
  countryCode      String
  latitude         Decimal?  @db.Decimal(10, 7)
  longitude        Decimal?  @db.Decimal(10, 7)
  phone            String?
  email            String?
  timezone         String    // kann von Tenant abweichen
  currency         String
  taxConfig        Json      // jurisdiktions-spezifisch
  openingHours     Json      // 7-day schedule
  publicProfile    Boolean   @default(true)
  marketplaceListed Boolean  @default(false)

  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  rooms            Room[]
  staffAssignments StaffLocation[]
  serviceVariants  ServiceVariant[]
  appointments     Appointment[]
  productStock     ProductStock[]

  @@unique([tenantId, slug])
  @@index([tenantId])
}

model Room {
  id               String    @id @default(uuid())
  tenantId         String
  locationId       String
  name             String
  capacity         Int       @default(1) // e.g. 2 for double chair
  features         String[]  // e.g. ["wash_basin", "color_bowl"]
  active           Boolean   @default(true)

  location         Location  @relation(fields: [locationId], references: [id])
  appointments     Appointment[]

  @@index([tenantId, locationId])
}

// ============ Staff ============

model Staff {
  id               String    @id @default(uuid())
  tenantId         String
  userId           String    @unique // FK zu User (Auth)
  firstName        String
  lastName         String
  displayName      String?
  email            String
  phone            String?
  role             StaffRole
  employmentType   EmploymentType
  commissionRate   Decimal?  @db.Decimal(5, 2) // %
  boothRent        Decimal?  @db.Decimal(10, 2)
  hourlyRate       Decimal?  @db.Decimal(10, 2)
  color            String?   // hex for calendar
  photoUrl         String?
  bio              String?
  startsAt         DateTime?
  active           Boolean   @default(true)

  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  locationAssignments StaffLocation[]
  services         StaffService[]
  shifts           Shift[]
  timeClock        TimeClock[]
  appointments     Appointment[]
  commissions      CommissionLine[]

  @@index([tenantId])
}

enum StaffRole {
  OWNER
  MANAGER
  FRONT_DESK
  STYLIST
  BOOTH_RENTER
  TRAINEE
  ASSISTANT
}

enum EmploymentType {
  EMPLOYEE
  CONTRACTOR
  BOOTH_RENTER
  COMMISSION
  OWNER
}

model StaffLocation {
  staffId     String
  locationId  String
  isPrimary   Boolean @default(false)

  staff       Staff    @relation(fields: [staffId], references: [id])
  location    Location @relation(fields: [locationId], references: [id])

  @@id([staffId, locationId])
}

// ============ Services ============

model ServiceCategory {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  order     Int      @default(0)

  services  Service[]

  @@index([tenantId])
}

model Service {
  id                String    @id @default(uuid())
  tenantId          String
  categoryId        String
  name              String
  slug              String
  description       String?
  durationMinutes   Int
  bufferBeforeMin   Int       @default(0)
  bufferAfterMin    Int       @default(0)
  basePrice         Decimal   @db.Decimal(10, 2)
  taxClass          String?
  bookable          Boolean   @default(true)
  requiresConsult   Boolean   @default(false)
  requiresPatchTest Boolean   @default(false)
  gender            Gender?
  color             String?   // calendar color
  order             Int       @default(0)
  forms             Form[]    @relation("ServiceForms")
  minDepositAmount  Decimal?  @db.Decimal(10, 2)
  minDepositPct     Decimal?  @db.Decimal(5, 2)

  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  category          ServiceCategory @relation(fields: [categoryId], references: [id])
  variants          ServiceVariant[]
  staffLinks        StaffService[]

  @@unique([tenantId, slug])
  @@index([tenantId, categoryId])
}

enum Gender {
  FEMALE
  MALE
  NEUTRAL
  KIDS
}

model ServiceVariant {
  id              String    @id @default(uuid())
  tenantId        String
  locationId      String
  serviceId       String
  price           Decimal   @db.Decimal(10, 2)
  durationMinutes Int?
  active          Boolean   @default(true)

  service         Service   @relation(fields: [serviceId], references: [id])
  location        Location  @relation(fields: [locationId], references: [id])

  @@unique([locationId, serviceId])
}

model StaffService {
  staffId         String
  serviceId       String
  priceOverride   Decimal?  @db.Decimal(10, 2)
  durationOverride Int?

  staff           Staff    @relation(fields: [staffId], references: [id])
  service         Service  @relation(fields: [serviceId], references: [id])

  @@id([staffId, serviceId])
}

// ============ Clients ============

model Client {
  id               String    @id @default(uuid())
  tenantId         String
  firstName        String
  lastName         String
  email            String?
  phone            String?
  phoneE164        String?   // normalisiert
  birthday         DateTime?
  pronouns         String?
  photoUrl         String?
  address          Json?
  language         String?   @default("en")
  marketingOptIn   Boolean   @default(false)
  smsOptIn         Boolean   @default(false)
  emailOptIn       Boolean   @default(false)
  notesInternal    String?   @db.Text
  allergies        String[]
  tags             String[]
  preferredStaffId String?
  noShowRisk       Decimal?  @db.Decimal(5, 2)
  lifetimeValue    Decimal   @default(0) @db.Decimal(12, 2)
  lastVisitAt      DateTime?
  totalVisits      Int       @default(0)
  blocked          Boolean   @default(false)
  familyParentId   String?
  source           String?   // e.g. "marketplace", "google", "referral"

  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  appointments     Appointment[]
  payments         Payment[]
  forms            FormSubmission[]
  photos           ClientPhoto[]
  loyalty          LoyaltyBalance?
  memberships      ClientMembership[]
  giftRedemptions  GiftCardRedemption[]
  family           Client[]  @relation("Family")
  parent           Client?   @relation("Family", fields: [familyParentId], references: [id])

  @@index([tenantId, phoneE164])
  @@index([tenantId, email])
  @@index([tenantId, lastVisitAt])
}

// ============ Appointments ============

model Appointment {
  id                String    @id @default(uuid())
  tenantId          String
  locationId        String
  clientId          String?
  staffId           String
  roomId            String?
  status            AppointmentStatus @default(BOOKED)
  startAt           DateTime
  endAt             DateTime
  bookedAt          DateTime  @default(now())
  bookedVia         BookingChannel
  notes             String?
  internalNotes     String?
  depositAmount     Decimal?  @db.Decimal(10, 2)
  depositPaid       Boolean   @default(false)
  depositPaidAt     DateTime?
  cancelledAt       DateTime?
  cancelReason      String?
  noShow            Boolean   @default(false)
  rescheduledFromId String?
  checkedInAt       DateTime?
  completedAt       DateTime?
  sourceCampaignId  String?
  language          String?

  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  location          Location  @relation(fields: [locationId], references: [id])
  client            Client?   @relation(fields: [clientId], references: [id])
  staff             Staff     @relation(fields: [staffId], references: [id])
  room              Room?     @relation(fields: [roomId], references: [id])
  items             AppointmentItem[]
  payment           Payment?
  productsUsed      ProductUsed[]
  reminders         Reminder[]

  @@index([tenantId, startAt])
  @@index([tenantId, staffId, startAt])
  @@index([tenantId, clientId, startAt])
  @@index([tenantId, status])
}

enum AppointmentStatus {
  BOOKED
  CONFIRMED
  CHECKED_IN
  IN_SERVICE
  COMPLETED
  CANCELLED
  NO_SHOW
  WAITLIST
}

enum BookingChannel {
  ONLINE_BRANDED
  ONLINE_WIDGET
  MARKETPLACE
  INSTAGRAM
  FACEBOOK
  GOOGLE_RESERVE
  TIKTOK
  WHATSAPP
  PHONE_AI
  PHONE_MANUAL
  SMS
  WALK_IN
  STAFF_INTERNAL
}

model AppointmentItem {
  id              String   @id @default(uuid())
  appointmentId   String
  serviceId       String
  staffId         String
  price           Decimal  @db.Decimal(10, 2)
  duration        Int
  taxClass        String?
  notes           String?

  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  service         Service     @relation(fields: [serviceId], references: [id])
  staff           Staff       @relation(fields: [staffId], references: [id])
}

// ============ Payments & POS ============

model Payment {
  id              String    @id @default(uuid())
  tenantId        String
  locationId      String
  clientId        String?
  appointmentId   String?   @unique
  staffId         String?   // processed by
  status          PaymentStatus @default(PENDING)
  subtotal        Decimal   @db.Decimal(10, 2)
  taxTotal        Decimal   @db.Decimal(10, 2)
  tipTotal        Decimal   @db.Decimal(10, 2) @default(0)
  discountTotal   Decimal   @db.Decimal(10, 2) @default(0)
  total           Decimal   @db.Decimal(10, 2)
  currency        String
  provider        String    // stripe, adyen, mollie, cash ...
  providerRef     String?
  method          String    // card, cash, giftcard, voucher, sepa, klarna
  takenAt         DateTime?
  refundedAmount  Decimal   @db.Decimal(10, 2) @default(0)
  receiptUrl      String?
  tseSignature    Json?     // TSE DE, RKSV AT etc.

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  appointment     Appointment? @relation(fields: [appointmentId], references: [id])
  client          Client?   @relation(fields: [clientId], references: [id])
  items           PaymentItem[]
  commissionLines CommissionLine[]
  tipSplits       TipSplit[]

  @@index([tenantId, takenAt])
  @@index([tenantId, appointmentId])
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  REFUNDED
  PARTIALLY_REFUNDED
  FAILED
  VOID
}

model PaymentItem {
  id           String   @id @default(uuid())
  paymentId    String
  type         PaymentItemType
  serviceId    String?
  productId    String?
  staffId      String?
  quantity     Int      @default(1)
  unitPrice    Decimal  @db.Decimal(10, 2)
  discount     Decimal  @db.Decimal(10, 2) @default(0)
  taxRate      Decimal  @db.Decimal(5, 2)
  total        Decimal  @db.Decimal(10, 2)

  payment      Payment  @relation(fields: [paymentId], references: [id])
}

enum PaymentItemType {
  SERVICE
  PRODUCT
  GIFT_CARD
  MEMBERSHIP
  PACKAGE
  FEE
}

model TipSplit {
  id           String   @id @default(uuid())
  paymentId    String
  staffId      String
  amount       Decimal  @db.Decimal(10, 2)
  method       TipMethod // CARD, CASH

  payment      Payment @relation(fields: [paymentId], references: [id])
}

enum TipMethod { CARD CASH }

model CommissionLine {
  id           String   @id @default(uuid())
  tenantId     String
  paymentId    String?
  staffId      String
  type         CommissionType
  baseAmount   Decimal  @db.Decimal(10, 2)
  rate         Decimal  @db.Decimal(5, 2)
  amount       Decimal  @db.Decimal(10, 2)
  payoutId     String?  // PayrollRun

  payment      Payment? @relation(fields: [paymentId], references: [id])
  staff        Staff    @relation(fields: [staffId], references: [id])
}

enum CommissionType { SERVICE RETAIL TIP BONUS }

// ============ Products & Inventory ============

model Product {
  id            String   @id @default(uuid())
  tenantId      String
  sku           String
  barcode       String?
  name          String
  description   String?
  brand         String?
  retail        Boolean  @default(true)
  professional  Boolean  @default(false)
  retailPrice   Decimal? @db.Decimal(10, 2)
  costPrice     Decimal? @db.Decimal(10, 2)
  taxClass      String?
  imageUrl      String?
  active        Boolean  @default(true)

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  stock         ProductStock[]
  used          ProductUsed[]

  @@unique([tenantId, sku])
  @@index([tenantId, barcode])
}

model ProductStock {
  productId    String
  locationId   String
  onHand       Int      @default(0)
  reorderPoint Int      @default(0)
  lot          String?
  expiresAt    DateTime?

  product      Product  @relation(fields: [productId], references: [id])
  location     Location @relation(fields: [locationId], references: [id])

  @@id([productId, locationId])
}

model ProductUsed {
  id            String   @id @default(uuid())
  appointmentId String
  productId     String
  quantity      Decimal  @db.Decimal(10, 3) // 0.050 etc.
  unit          String?  // g, ml, unit
  notes         String?

  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  product       Product     @relation(fields: [productId], references: [id])
}

// ============ Forms ============

model Form {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  schema      Json     // JSON-Schema der Felder
  hipaa       Boolean  @default(false)
  version     Int      @default(1)
  active      Boolean  @default(true)

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  services    Service[] @relation("ServiceForms")
  submissions FormSubmission[]
}

model FormSubmission {
  id          String   @id @default(uuid())
  tenantId    String
  formId      String
  clientId    String
  data        Json
  signatureUrl String?
  signedAt    DateTime?
  appointmentId String?
  version     Int

  form        Form     @relation(fields: [formId], references: [id])
  client      Client   @relation(fields: [clientId], references: [id])

  @@index([clientId])
}

model ClientPhoto {
  id          String   @id @default(uuid())
  tenantId    String
  clientId    String
  url         String
  category    String?  // "before", "after", "reference"
  consentUrl  String?
  tags        String[]
  takenAt     DateTime @default(now())

  client      Client   @relation(fields: [clientId], references: [id])

  @@index([clientId])
}

// ============ Loyalty, Memberships, Gift Cards ============

model LoyaltyProgram {
  id            String  @id @default(uuid())
  tenantId      String
  name          String
  type          LoyaltyType
  pointsPerCurrency Decimal? @db.Decimal(6, 2)
  pointsForReward   Int?
  rewardValue       Decimal? @db.Decimal(10, 2)
  tieredRules       Json?
  active        Boolean @default(true)
}

enum LoyaltyType { POINTS PUNCH_CARD TIERED }

model LoyaltyBalance {
  id         String @id @default(uuid())
  tenantId   String
  clientId   String @unique
  points     Int    @default(0)
  tier       String?

  client     Client @relation(fields: [clientId], references: [id])
}

model MembershipPlan {
  id            String  @id @default(uuid())
  tenantId      String
  name          String
  price         Decimal @db.Decimal(10, 2)
  interval      String  // month, year
  includedServices Json // list of {serviceId, quantity}
  discountPct   Decimal? @db.Decimal(5, 2)
  active        Boolean @default(true)
}

model ClientMembership {
  id              String   @id @default(uuid())
  tenantId        String
  clientId        String
  planId          String
  stripeSubId     String?
  status          String   // active, paused, cancelled, past_due
  startedAt       DateTime
  currentPeriodEnd DateTime
  cancelledAt     DateTime?

  client          Client   @relation(fields: [clientId], references: [id])

  @@index([tenantId, status])
}

model GiftCard {
  id            String   @id @default(uuid())
  tenantId      String
  code          String   @unique
  initialValue  Decimal  @db.Decimal(10, 2)
  balance       Decimal  @db.Decimal(10, 2)
  currency      String
  issuedTo      String?  // recipient name or email
  issuedAt      DateTime @default(now())
  expiresAt     DateTime?
  status        String   @default("active")
}

model GiftCardRedemption {
  id            String   @id @default(uuid())
  giftCardId    String
  paymentId     String?
  amount        Decimal  @db.Decimal(10, 2)
  redeemedAt    DateTime @default(now())
  clientId      String?

  client        Client?  @relation(fields: [clientId], references: [id])
}

// ============ Marketing & Campaigns ============

model Campaign {
  id           String   @id @default(uuid())
  tenantId     String
  name         String
  type         String   // EMAIL, SMS, WHATSAPP, PUSH, MIXED
  status       String   // draft, scheduled, sending, sent
  segmentJson  Json     // segment definition
  templateId   String?
  scheduledFor DateTime?
  startedAt    DateTime?
  finishedAt   DateTime?
  stats        Json?    // opens, clicks, conversions, revenue

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  messages     Message[]
}

model Message {
  id            String   @id @default(uuid())
  tenantId      String
  campaignId    String?
  channel       String
  toClientId    String?
  toAddress     String   // phone or email
  subject       String?
  body          String   @db.Text
  status        String   // queued, sent, delivered, bounced, clicked
  providerId    String?
  sentAt        DateTime?
  openedAt      DateTime?
  clickedAt     DateTime?

  campaign      Campaign? @relation(fields: [campaignId], references: [id])

  @@index([tenantId, channel, sentAt])
}

// ============ Flows / Automations ============

model Flow {
  id        String @id @default(uuid())
  tenantId  String
  name      String
  trigger   Json   // { event: "appointment_completed", conditions: [...] }
  steps     Json   // [{type:"wait", minutes:60},{type:"send_sms", templateId:"..."}]
  active    Boolean @default(true)
}

model FlowRun {
  id        String   @id @default(uuid())
  flowId    String
  clientId  String?
  appointmentId String?
  status    String
  startedAt DateTime @default(now())
  finishedAt DateTime?
  trace     Json?
}

// ============ Reviews ============

model Review {
  id          String  @id @default(uuid())
  tenantId    String
  locationId  String
  staffId     String?
  clientId    String?
  rating      Int
  text        String?
  source      String  // internal, google, facebook, yelp
  externalId  String?
  responseText String?
  respondedAt DateTime?
  sentiment   String? // positive, neutral, negative (AI)
  createdAt   DateTime @default(now())
}

// ============ Staff Scheduling ============

model Shift {
  id          String   @id @default(uuid())
  tenantId    String
  staffId     String
  locationId  String
  startAt     DateTime
  endAt       DateTime
  isOpen      Boolean  @default(false) // unassigned shift
  claimedAt   DateTime?

  staff       Staff    @relation(fields: [staffId], references: [id])
}

model TimeOff {
  id          String   @id @default(uuid())
  tenantId    String
  staffId     String
  startAt     DateTime
  endAt       DateTime
  reason      String?
  status      String   // pending, approved, rejected

  staff       Staff    @relation(fields: [staffId], references: [id])
}

model TimeClock {
  id          String   @id @default(uuid())
  tenantId    String
  staffId     String
  clockIn     DateTime
  clockOut    DateTime?
  breakMinutes Int      @default(0)
  totalMinutes Int?     // computed

  staff       Staff    @relation(fields: [staffId], references: [id])
}

// ============ Integrations & API ============

model Integration {
  id          String   @id @default(uuid())
  tenantId    String
  type        String   // google_calendar, meta, quickbooks, datev, ...
  config      Json     // encrypted
  status      String
  lastSyncAt  DateTime?
}

model ApiKey {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  keyPrefix   String   // "sk_live_...abc"
  hashedKey   String
  scopes      String[]
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime?
  revoked     Boolean  @default(false)
}

model Webhook {
  id          String   @id @default(uuid())
  tenantId    String
  url         String
  secret      String
  events      String[]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model WebhookDelivery {
  id          String   @id @default(uuid())
  webhookId   String
  event       String
  payload     Json
  statusCode  Int?
  attempt     Int      @default(1)
  lastError   String?
  deliveredAt DateTime?
}

// ============ Audit ============

model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String
  actorId    String?
  actorType  String?  // user, api, system
  entity     String
  entityId   String
  action     String   // create, update, delete, login
  diff       Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([tenantId, entity, entityId])
  @@index([tenantId, createdAt])
}
```

## 3. RLS-Beispiel

```sql
-- Aktivierung
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
-- (für alle tenant-Tabellen)

-- Session-Variable-Setup durch App-Middleware:
SET LOCAL app.current_tenant_id = '…uuid…';
SET LOCAL app.current_user_id = '…uuid…';
SET LOCAL app.current_role = 'owner';

-- Tenant-Isolation:
CREATE POLICY tenant_isolation ON appointment
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Staff darf nur eigene Termine sehen (Rolle STYLIST):
CREATE POLICY stylist_own_only ON appointment
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      current_setting('app.current_role') IN ('owner','manager','front_desk')
      OR staff_id = current_setting('app.current_user_id')::uuid
    )
  );
```

## 4. Indizes & Performance

- `appointment (tenant_id, start_at)` — Hauptabfrage Kalender
- `appointment (tenant_id, staff_id, start_at)` — Stylist-Sicht
- `client (tenant_id, phone_e164)` / `(tenant_id, email)` — Deduplizierung
- `payment (tenant_id, taken_at)` — Reporting
- `product (tenant_id, barcode)` — Barcode-Scan
- `audit_log (tenant_id, created_at)` — partitioniert per Monat

## 5. Migrations-Strategie

- **Prisma Migrate** oder **Drizzle Kit** für SQL-Migrations.
- Jede Migration ist **abwärtskompatibel**: „expand → deploy → contract".
- Zero-Downtime-Deployments: neue Spalten nullable, Backfill-Jobs in BullMQ.

## 6. Seed-Daten

Für Dev + Demo:

```
- 1 Tenant „Demo Beauty Studio" (DE, EUR, Europe/Berlin)
- 3 Locations (Berlin, München, Hamburg)
- 8 Staff (Mix: 2 Owner, 2 Manager, 4 Stylist)
- 40 Services (Hair/Nails/Face)
- 200 Clients (Fake via Faker.js, realistische deutsche Namen)
- 2000 historische Appointments (letzte 90 Tage, verschiedene Statuses)
- 30 Produkte (Haarpflege, Nagellack, Make-up)
- Demo-Campaigns, Memberships, Gift-Cards
```

## 7. Daten-Export & Ownership

- **DSGVO Art. 20** (Datenportabilität): vollständiger ZIP-Export pro Client (JSON + CSV + Medien).
- **Tenant-Export:** vollständiger DB-Dump als `.sql.gz` + Media-ZIP, per Support anforderbar, verschlüsselt (PGP).
- **Right-to-be-forgotten:** kaskadierende Löschung mit Audit-Log-Eintrag (ohne PII im Log).

