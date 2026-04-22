# SALON OS — Deploy-Anleitung

Ziel: `https://<irgendwas>.railway.app` erreichbar mit Beautycenter-by-Neta als Demo-Tenant.

## Schnellster Weg — Railway (10 Minuten, 1 Account)

### 1. GitHub-Repo anlegen + pushen

```bash
cd ~/salon-os

# Repo im Browser anlegen: https://github.com/new
# Name: salon-os    Visibility: Private    (KEIN README/gitignore auto-add)

git remote add origin https://github.com/<DEIN-USER>/salon-os.git
git push -u origin main
# GitHub fragt nach Login — PAT oder GitHub-Desktop-Auth reicht.
```

### 2. Auf Railway deployen

1. [`railway.com`](https://railway.com) öffnen → mit GitHub anmelden.
2. **New Project → Deploy from GitHub repo → `salon-os`**.
3. Railway legt automatisch 3 Services an: `api`, `web`, `worker`
   (erkennt `apps/*` via `pnpm-workspace.yaml` + Dockerfiles).
4. Im Projekt: **+ New → Database → PostgreSQL**. Railway setzt `DATABASE_URL` automatisch.
5. Im Projekt: **+ New → Database → Redis**. Railway setzt `REDIS_URL` automatisch.
6. Auf `api` + `worker` Services gehen: **Variables** → `DATABASE_URL` + `REDIS_URL`
   als **Reference**-Variablen auf die Postgres-/Redis-Services setzen.

### 3. Env-Variablen (minimal)

In Railway UI pro Service setzen:

**`api`:**

```
NODE_ENV=production
PORT=4000
ALLOWED_ORIGINS=https://<dein-web-service>.railway.app
WORKOS_API_KEY=LEER_FÜR_DEV
WORKOS_CLIENT_ID=LEER_FÜR_DEV
WORKOS_COOKIE_PASSWORD=LEER_FÜR_DEV
```

> ⚠️ `assertProductionSafety()` in [`apps/api/src/main.ts`](apps/api/src/main.ts) blockt den Start in `production` ohne WorkOS-Keys.
> Für Demo-Zwecke setze vorübergehend `NODE_ENV=staging` statt `production`.

**`web`:**

```
NODE_ENV=production
PUBLIC_API_URL=https://<api-service>.railway.app
DEMO_TENANT_ID=    # nach Seed füllen (siehe Schritt 5)
DEMO_USER_ID=      # nach Seed füllen
```

### 4. DB-Migration + Seed

Auf dem `api`-Service: **Settings → Custom Start Command** vorübergehend setzen auf:

```bash
pnpm --filter @salon-os/db db:migrate:deploy && pnpm --filter @salon-os/db db:seed && node apps/api/dist/main.js
```

→ einmalig redeploy. Logs anschauen, die Seed-Ausgabe zeigt
`tenant=beautycenter-by-neta owner=lorenc@beautyneta.ch — ready` und **die IDs**.

### 5. Demo-IDs aus Seed holen

In Railway Shell (oder Postgres-Plugin):

```sql
SELECT id FROM tenant WHERE slug = 'beautycenter-by-neta';
SELECT id FROM "user" WHERE email = 'lorenc@beautyneta.ch';
```

Diese zwei IDs als `DEMO_TENANT_ID` + `DEMO_USER_ID` im `web`-Service eintragen → redeploy `web`.

### 6. URLs

- **Admin (Staff-View):** `https://<web-service>.railway.app` → Kalender, Kunden
- **Public Booking:** `https://<web-service>.railway.app/book/beautycenter-by-neta`
- **API Health:** `https://<api-service>.railway.app/health`

## Alternative — Fly.io + Vercel

Configs stehen: [`apps/api/fly.toml`](apps/api/fly.toml), [`apps/worker/fly.toml`](apps/worker/fly.toml), [`apps/web/vercel.json`](apps/web/vercel.json).

```bash
# einmalig
brew install flyctl vercel-cli
fly auth login
vercel login

# API + Worker
cd apps/api && fly launch --copy-config --dockerfile Dockerfile
fly postgres create --region zrh --name salon-os-db
fly postgres attach salon-os-db
fly secrets set NODE_ENV=staging

cd ../worker && fly launch --copy-config --dockerfile Dockerfile

# Web
cd ../web && vercel link && vercel --prod
vercel env add PUBLIC_API_URL production   # https://salon-os-api.fly.dev
vercel env add DEMO_TENANT_ID production
vercel env add DEMO_USER_ID production
```

## Nach dem ersten Deploy

Sobald alles läuft — **rotiere alle Tokens**, die du ggf. im Chat geteilt hast.
WorkOS-Integration ist der nächste Schritt, damit der `x-tenant-id`-Header-Modus
verschwindet.
