import Link from 'next/link';
import { Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { saveAdsIntegration, deleteAdsIntegration } from './actions';

interface AdsStatus {
  configured: boolean;
  enabled: boolean;
  customerId: string | null;
  loginCustomerId: string | null;
  refreshTokenStatus: 'set' | 'unset';
  conversionActions: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

async function loadStatus(): Promise<AdsStatus | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<AdsStatus>('/v1/ads/settings', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'noch nie';
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdsIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const status = await loadStatus();

  if (!status) {
    return (
      <div className="w-full p-4 md:p-8">
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">Status konnte nicht geladen werden.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const meta = (status.conversionActions['_meta'] ?? {}) as {
    googleAdsId?: string;
    ga4MeasurementId?: string;
  };
  const bookingLabel =
    typeof status.conversionActions['booking_completed'] === 'string'
      ? (status.conversionActions['booking_completed'] as string)
      : '';

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Einstellungen
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Google-Ads-Integration
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Verbindet diesen Salon mit deinem Google-Ads-Konto. Conversions werden bei jeder Buchung
          mit GCLID server-seitig hochgeladen, Spend-Daten täglich um 04:00 UTC gepullt.
        </p>
      </header>

      {sp.saved ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Gespeichert.
        </div>
      ) : null}
      {sp.deleted ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Integration gelöscht.
        </div>
      ) : null}

      {/* Status-Card */}
      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-3 text-base font-semibold">Status</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs text-text-muted">Konfiguriert</dt>
              <dd
                className={`mt-1 font-medium ${
                  status.configured ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {status.configured ? '✓ Ja' : '— Nein'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Aktiv</dt>
              <dd
                className={`mt-1 font-medium ${
                  status.enabled ? 'text-emerald-700' : 'text-zinc-600'
                }`}
              >
                {status.enabled ? '✓ Conversions + Spend-Sync laufen' : '— Pausiert'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Refresh-Token</dt>
              <dd className="mt-1 font-medium">
                {status.refreshTokenStatus === 'set' ? '🔒 hinterlegt' : '— fehlt'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Letzter Spend-Sync</dt>
              <dd className="mt-1 font-medium">{fmtDate(status.lastSyncAt)}</dd>
            </div>
            {status.lastSyncError ? (
              <div className="md:col-span-2">
                <dt className="text-xs text-text-muted">Fehler beim letzten Sync</dt>
                <dd className="mt-1 break-words text-xs text-red-700">{status.lastSyncError}</dd>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      {/* Form */}
      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Konfiguration</h2>
          <form action={saveAdsIntegration} className="space-y-4">
            <Field label="Google-Ads Customer-ID" required>
              <Input
                required
                name="customerId"
                pattern="[0-9]+"
                placeholder="1090554000"
                defaultValue={status.customerId ?? ''}
              />
            </Field>
            <Field label="Login-Customer-ID (MCC)">
              <Input
                name="loginCustomerId"
                pattern="[0-9]*"
                placeholder="4716972121 (leer wenn kein Manager-Account)"
                defaultValue={status.loginCustomerId ?? ''}
              />
            </Field>

            <Field
              label={
                status.refreshTokenStatus === 'set'
                  ? 'OAuth Refresh-Token (leer lassen wenn unverändert)'
                  : 'OAuth Refresh-Token *'
              }
            >
              <Input
                name="refreshToken"
                type="password"
                placeholder={
                  status.refreshTokenStatus === 'set'
                    ? '••••••••••••• (gesetzt — leer lassen um zu behalten)'
                    : '1//0eK...'
                }
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Google-Ads-ID (gtag)">
                <Input
                  name="googleAdsId"
                  pattern="AW-[0-9]+"
                  placeholder="AW-18005447088"
                  defaultValue={meta.googleAdsId ?? ''}
                />
              </Field>
              <Field label="GA4 Measurement-ID">
                <Input
                  name="ga4MeasurementId"
                  pattern="G-[A-Z0-9]+"
                  placeholder="G-HTR7SG4GGL"
                  defaultValue={meta.ga4MeasurementId ?? ''}
                />
              </Field>
            </div>

            <Field label="Booking-Completed Conversion-Label (gtag send_to)">
              <Input
                name="bookingCompletedLabel"
                placeholder="AW-18005447088/_M6bCOCAgYkcELCj1YlD"
                defaultValue={bookingLabel}
              />
            </Field>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                defaultChecked={status.enabled || !status.configured}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="enabled" className="text-sm text-text-primary">
                Integration aktiv (Conversions + Spend-Sync)
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit">Speichern</Button>
              <Link
                href="/ads-dashboard"
                className="text-sm text-text-muted hover:text-accent"
              >
                Zum Ads-Dashboard →
              </Link>
            </div>
          </form>

          {status.configured ? (
            <form action={deleteAdsIntegration} className="mt-8 border-t border-border pt-6">
              <h3 className="mb-2 text-sm font-semibold text-red-700">Gefährlicher Bereich</h3>
              <p className="mb-3 text-xs text-text-muted">
                Löscht die Integration komplett (Refresh-Token unwiederbringlich entfernt). Bisher
                gepullte Spend-Daten bleiben erhalten.
              </p>
              <button
                type="submit"
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Integration löschen
              </button>
            </form>
          ) : null}
        </CardBody>
      </Card>

      {/* Doku-Hint */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="mb-2 text-sm font-semibold">Wo bekomme ich diese Werte?</h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-text-secondary">
            <li>
              <strong>Customer-ID</strong>: oben rechts in deinem Google-Ads-Konto (10-stellig).
            </li>
            <li>
              <strong>Login-Customer-ID</strong>: nur wenn du via MCC zugreifst — die Manager-ID.
              Sonst leer lassen.
            </li>
            <li>
              <strong>Refresh-Token</strong>: aus deiner OAuth2-App (z.B. via OAuth-Playground oder
              eigene Console). Der ist sensitiv und wird AES-256-GCM-verschlüsselt gespeichert.
            </li>
            <li>
              <strong>Google-Ads-ID + Conversion-Label</strong>: Tools → Conversions → Tag-Setup
              zeigt das gtag-Snippet, der <code>send_to</code>-Wert ist Format{' '}
              <code>AW-XXX/Label</code>.
            </li>
            <li>
              <strong>GA4 Measurement-ID</strong>: GA4 Property → Datenstreams → Web → MID.
            </li>
            <li>
              Globale OAuth-Creds (
              <code>GOOGLE_ADS_CLIENT_ID</code>, <code>_SECRET</code>,{' '}
              <code>_DEVELOPER_TOKEN</code>) und <code>APP_ENCRYPTION_KEY</code> setzt der
              Hosting-Admin in den Server-ENV-Vars.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
