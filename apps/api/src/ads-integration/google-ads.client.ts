/**
 * Google-Ads REST-Client für Salon-OS. Multi-Tenant: jeder Tenant kann
 * sein eigenes Google-Ads-Konto verbinden, Refresh-Token wird in
 * tenant_ads_integration.refreshTokenEncrypted abgelegt.
 *
 * Zwei Use-Cases:
 *   - uploadClickConversion (Capability 2): Booking → Google-Ads
 *   - runGaql (Capability 3): Daily Spend-Pull
 *
 * Access-Token-Cache pro Tenant (1h TTL).
 */
import { createHash } from 'node:crypto';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ADS_API_VERSION = 'v21';
const TOKEN_TTL_BUFFER_MS = 60_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

export interface AdsCredentials {
  /** Tenant-Identifier — Cache-Key für Access-Token. */
  tenantId: string;
  /** Pro Tenant individuell. Aus tenant_ads_integration. */
  customerId: string;
  /** MCC-Manager. Aus tenant_ads_integration (kann null sein). */
  loginCustomerId: string | null;
  /** Bereits dekrypteter Refresh-Token (Caller decrypts via @salon-os/utils). */
  refreshToken: string;
  /** Aus env: GOOGLE_ADS_CLIENT_ID / SECRET / DEVELOPER_TOKEN — geteilt
   *  zwischen allen Tenants (Salon-OS-eigene OAuth-App). */
  clientId: string;
  clientSecret: string;
  developerToken: string;
}

export interface ConversionInput {
  /** AW-XXX/Label oder vollqualifizierte resource-name. Wird normalisiert. */
  conversionAction: string;
  /** Click-ID — wenn vorhanden, primärer Match. */
  gclid?: string | null;
  /** Email (lowercased + sha256-hashed beim send). Optional Fallback. */
  email?: string | null;
  /** Phone E.164 (sha256-hashed). Optional Fallback. */
  phoneE164?: string | null;
  /** Booking-Wert. */
  valueChf?: number;
  /** Zeitpunkt der Buchung (UTC). */
  bookedAt: Date;
  /** Eindeutige ID — für Dedup auf Google-Seite. */
  orderId: string;
}

export type ConversionUploadResult =
  | { ok: true; received: number; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizePhoneE164(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function formatConversionDateTime(d: Date): string {
  // Google Ads: "yyyy-MM-dd HH:mm:ss+00:00"
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}+00:00`;
}

/**
 * Resource-name normalisieren. Akzeptiert:
 *   "customers/123/conversionActions/456"   ← already canonical
 *   "AW-18005447088/_M6bCOCAgYkcELCj1YlD"   ← gtag-Format → wir splitten
 *   "456"                                    ← bare ID
 */
function buildConversionActionResource(input: string, customerId: string): string {
  if (input.startsWith('customers/')) return input;
  // AW-XXX/Label → der Numeric-Anteil von AW-XXX ist NICHT die conversionAction-ID,
  // das ist die Conversion-Action-Numeric-ID (zweite Komponente nach "/").
  // gtag's "AW-{convId}/{label}" wird beim Server-Side Upload als
  // resource-name customers/{cid}/conversionActions/{convId} benötigt.
  const match = input.match(/^AW-(\d+)/);
  if (match) {
    return `customers/${customerId}/conversionActions/${match[1]}`;
  }
  if (/^\d+$/.test(input)) {
    return `customers/${customerId}/conversionActions/${input}`;
  }
  return input;
}

async function getAccessToken(creds: AdsCredentials): Promise<string> {
  const now = Date.now();
  const cached = tokenCache.get(creds.tenantId);
  if (cached && cached.expiresAt > now + TOKEN_TTL_BUFFER_MS) return cached.accessToken;

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`oauth refresh failed: ${r.status} ${t.slice(0, 300)}`);
  }
  const data = (await r.json()) as { access_token: string; expires_in: number };
  tokenCache.set(creds.tenantId, {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function uploadClickConversion(
  creds: AdsCredentials,
  conv: ConversionInput,
): Promise<ConversionUploadResult> {
  if (!conv.gclid && !conv.email && !conv.phoneE164) {
    return { ok: false, error: 'no gclid and no hashed-PII fallback — refusing to upload' };
  }

  let token: string;
  try {
    token = await getAccessToken(creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const conversionAction = buildConversionActionResource(
    conv.conversionAction,
    creds.customerId,
  );

  const conversion: Record<string, unknown> = {
    conversionAction,
    conversionDateTime: formatConversionDateTime(conv.bookedAt),
    orderId: conv.orderId,
  };
  if (conv.gclid) {
    conversion['gclid'] = conv.gclid;
  } else {
    const userIdentifiers: Array<Record<string, string>> = [];
    if (conv.email) userIdentifiers.push({ hashedEmail: sha256Hex(normalizeEmail(conv.email)) });
    if (conv.phoneE164) {
      userIdentifiers.push({
        hashedPhoneNumber: sha256Hex(normalizePhoneE164(conv.phoneE164)),
      });
    }
    conversion['userIdentifiers'] = userIdentifiers;
  }
  if (typeof conv.valueChf === 'number' && Number.isFinite(conv.valueChf) && conv.valueChf > 0) {
    conversion['conversionValue'] = conv.valueChf;
    conversion['currencyCode'] = 'CHF';
  }

  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${creds.customerId}:uploadClickConversions`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'developer-token': creds.developerToken,
    'Content-Type': 'application/json',
  };
  if (creds.loginCustomerId) headers['login-customer-id'] = creds.loginCustomerId;

  let r: Response;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversions: [conversion],
        partialFailure: true,
      }),
    });
  } catch (e) {
    return { ok: false, error: `network: ${e instanceof Error ? e.message : String(e)}` };
  }
  const text = await r.text();
  if (!r.ok) {
    return { ok: false, error: `${r.status} ${text.slice(0, 500)}`, raw: text };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  const obj = parsed as { results?: unknown[]; partialFailureError?: { message?: string } };
  if (obj.partialFailureError) {
    return { ok: false, error: `partial: ${obj.partialFailureError.message ?? 'unknown'}`, raw: parsed };
  }
  return { ok: true, received: obj.results?.length ?? 0, raw: parsed };
}

// ─── GAQL Query (Capability 3 — daily spend-pull) ─────────────────

export interface GaqlRow {
  [key: string]: unknown;
}

export async function runGaql(creds: AdsCredentials, query: string): Promise<GaqlRow[]> {
  const token = await getAccessToken(creds);
  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${creds.customerId}/googleAds:searchStream`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'developer-token': creds.developerToken,
    'Content-Type': 'application/json',
  };
  if (creds.loginCustomerId) headers['login-customer-id'] = creds.loginCustomerId;

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`gaql ${r.status}: ${text.slice(0, 500)}`);
  }
  // searchStream returns a JSON array of stream chunks: [ { results: [...] }, ... ]
  let chunks: Array<{ results?: GaqlRow[] }>;
  try {
    chunks = JSON.parse(text) as Array<{ results?: GaqlRow[] }>;
  } catch {
    return [];
  }
  return chunks.flatMap((c) => c.results ?? []);
}
