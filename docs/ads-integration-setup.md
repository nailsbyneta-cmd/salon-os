# Google-Ads Integration Setup (pro Tenant)

Du brauchst das nur **einmal pro Tenant**. Nach dem Setup läuft alles automatisch:
GCLID-Capture, Conversion-Upload, Daily-Spend-Sync, Dashboard.

## Was du parat haben musst

1. **Google Ads Refresh-Token** — aus 1Password, gleicher der heute schon
   im beautyneta-web Confirmation-Worker steckt.
2. **Google Ads Customer-ID** — z.B. `1090554000` (Beautyneta).
3. **Login Customer-ID (MCC)** — z.B. `4716972121` falls du über einen
   Manager-Account zugreifst, sonst leer lassen.
4. **Conversion-Action** — der `AW-XXX/Label`-Wert aus dem gtag-Snippet,
   z.B. `AW-18005447088/_M6bCOCAgYkcELCj1YlD`.
5. **GA4 Measurement-ID** — `G-XXXXXXXXXX` falls du GA4-Events mitfeuern willst.

## Schritt 1: Encryption-Key generieren (einmalig fürs ganze Projekt)

Der Refresh-Token wird AES-256-GCM verschlüsselt in der DB gespeichert.
Schlüssel niemals committen, niemals rotieren ohne Re-Encrypt.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Den Output:

- ✅ in **Railway** als ENV-Var `APP_ENCRYPTION_KEY` setzen (Service: salon-os)
- ✅ in deiner lokalen `.env` (für seed-Script)
- ✅ in 1Password speichern (Backup — wenn er weg ist sind alle Tokens unbrauchbar)

## Schritt 2: OAuth-Creds + Developer-Token in Railway setzen

Diese sind global (geteilt zwischen allen Tenants — Salon-OS-eigene OAuth-App):

```
GOOGLE_ADS_CLIENT_ID=<client-id aus Google Cloud Console>
GOOGLE_ADS_CLIENT_SECRET=<client-secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<developer-token>
```

Schnellster Weg via Railway-CLI:

```bash
railway service salon-os
railway variables \
  --set APP_ENCRYPTION_KEY="<vom-schritt-1>" \
  --set GOOGLE_ADS_CLIENT_ID="<...>" \
  --set GOOGLE_ADS_CLIENT_SECRET="<...>" \
  --set GOOGLE_ADS_DEVELOPER_TOKEN="<...>"
```

## Schritt 3: Tenant verknüpfen

```bash
APP_ENCRYPTION_KEY="<gleicher-wie-railway>" \
TENANT_SLUG=beautycenter-by-neta \
GOOGLE_ADS_CUSTOMER_ID=1090554000 \
GOOGLE_ADS_LOGIN_CUSTOMER_ID=4716972121 \
GOOGLE_ADS_REFRESH_TOKEN="<aus-1password>" \
GOOGLE_ADS_GTAG_ID=AW-18005447088 \
GA4_MEASUREMENT_ID=G-HTR7SG4GGL \
BOOKING_COMPLETED_LABEL="AW-18005447088/_M6bCOCAgYkcELCj1YlD" \
pnpm --filter @salon-os/db setup:ads
```

Output sollte sein:

```
✔ tenant_ads_integration upserted
  tenant: Beautycenter by Neta (uuid)
  customerId: 1090554000
  conversion-actions: booking_completed
```

## Schritt 4: Verifizieren

1. **Public-Info zeigt adsTracking-Block:**

   ```bash
   curl -s https://salon-os-production-2346.up.railway.app/v1/public/beautycenter-by-neta/info \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['adsTracking'])"
   ```

   Erwartung: `{'googleAdsId': 'AW-18005447088', 'ga4MeasurementId': 'G-HTR7SG4GGL', 'conversionLabels': {'booking_completed': '...'}}`

2. **Test-Booking mit `?gclid=TEST_X` durchklicken:**
   - URL: `https://<dein-web>/book/beautycenter-by-neta?gclid=TEST_X`
   - Service auswählen → Slot → Bestätigen
   - Auf /success-Page sollte gtag.js geladen sein (DevTools → Network → `gtag/js`)

3. **DB-Check:**

   ```sql
   SELECT id, "attributionGclid", "attributionSource", "conversionUploadedAt"
   FROM appointment ORDER BY "createdAt" DESC LIMIT 1;
   ```

   `attributionGclid = 'TEST_X'`, `attributionSource = 'google_ads'`.

4. **Outbox-Worker-Log:** sollte `ads-conv` mit Erfolg zeigen, dann
   `conversionUploadedAt` gesetzt.

5. **Nach 24h:** GitHub Actions Cron `cron-ads-spend` lief. Check:

   ```sql
   SELECT * FROM tenant_ads_spend_daily ORDER BY date DESC LIMIT 5;
   ```

6. **Dashboard:** `/admin/ads-dashboard` zeigt Spend / Conversions / ROAS.

## Wenn was nicht läuft

| Symptom                                   | Ursache                                                                 | Fix                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `decrypt refresh-token failed` im API-log | `APP_ENCRYPTION_KEY` weicht ab zwischen seed und Railway                | Beide auf gleichen Wert setzen, dann `setup:ads` re-run                       |
| `oauth refresh failed: 400`               | Refresh-Token ungültig oder revoked                                     | Neuen Token in Google Cloud Console generieren                                |
| `developer-token` Fehler 401              | Developer-Token nicht approved für dieses Customer                      | Im Google-Ads Manager API-Center anfordern                                    |
| `tenant_ads_spend_daily` bleibt leer      | Cron läuft erst nach 04:00 UTC, oder Customer hat keine Kampagnen aktiv | manuell triggern: `gh workflow run cron-ads-spend.yml -f date=2026-04-27`     |
| Dashboard zeigt 0 Conversions             | Bookings haben kein `attributionSource='google_ads'`                    | Mit `?gclid=...` in URL testen — der Capture läuft nur wenn der Param ankommt |
