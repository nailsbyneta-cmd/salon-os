# Salon-OS Scripts

## provision-tenant.ts

CLI-Script um neuen Tenant aufzusetzen. Aktuell **Scaffold** — manuell erweiterbar wenn 2. Kunde kommt.

### Beispiel

```bash
cd ~/salon-os/apps/api  # damit @prisma/client da ist
npx tsx ../../scripts/provision-tenant.ts \
  --slug "musterhof" \
  --name "Musterhof Salon GmbH" \
  --billing-email "billing@musterhof.ch" \
  --owner-email "kontakt@musterhof.ch" \
  --owner-name "Anna Muster" \
  --plan PROFESSIONAL \
  --dry-run
```

### Was fehlt für End-to-End

1. **Defaults-Seeder** — `--with-defaults` ist Stub. Sollte seeden:
   - 1× Default-Location (Hauptfiliale)
   - 5× Default-Services (Haarschnitt H/D, Färbung, Maniküre, Pediküre)
   - Default-Shift-Templates (Mo-Sa 09-19)
   - Default-WhatsApp-Templates (Reminder, Confirmation)
2. **WorkOS-Sync** — `tenant.workosOrgId` Column fehlt im Schema. Migration nötig.
3. **DNS-Automation** — Cloudflare-API-Call für Subdomain (jetzt manuell).
4. **Stripe-Setup** — Customer + Subscription anlegen (wenn aus Trial in Paid).
5. **Magic-Link-Mail** — WorkOS Magic-Link an Owner triggern.

### Wann das ausbauen

Erst sobald 2. Tenant tatsächlich kommt. Vorher = vorzeitige Optimierung.
Aktuell ist nur Beautyneta Tenant — manuelles Setup hat 1× < 30 Min gedauert,
Automation lohnt erst ab 3-5 Tenants.

## daily-audit.sh

Täglicher Code/Security-Audit (rotating focus). Siehe File-Header.
Plist: `~/mac-mini-migration/launchd/com.lorenc.salon-os.daily-audit.plist`

## monitor.sh

(Bestehend) Prozess-Monitor — pingt bei Blockern, offenen Fragen, Git-Stille.
Plist: `~/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist`
