import { Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { runReactivation } from './actions';

interface Preview {
  eligible: number;
  lastRunAt: string | null;
  lastRunCount: number;
}

async function loadPreview(): Promise<Preview> {
  const ctx = getCurrentTenant();
  try {
    return await apiFetch<Preview>('/v1/marketing/reactivation', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return { eligible: 0, lastRunAt: null, lastRunCount: 0 };
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

export default async function MarketingPage(): Promise<React.JSX.Element> {
  const preview = await loadPreview();

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Marketing</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Reaktivierung
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Schreib Kundinnen automatisch an, die seit über 90 Tagen nicht da waren.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Aktuell eligible
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums text-text-primary">
              {preview.eligible}
            </p>
            <p className="text-xs text-text-muted">
              {preview.eligible === 0
                ? 'Niemand bereit für Re-Engagement'
                : `${preview.eligible === 1 ? 'Kundin wartet' : 'Kundinnen warten'} auf eine Erinnerung`}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Letzte Aktion
            </p>
            <p className="font-display text-lg font-semibold text-text-primary">
              {fmtDate(preview.lastRunAt)}
            </p>
            <p className="text-xs text-text-muted">
              {preview.lastRunCount > 0
                ? `${preview.lastRunCount} Email${preview.lastRunCount === 1 ? '' : 's'} verschickt`
                : 'Noch nie ausgelöst'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Cooldown
            </p>
            <p className="font-display text-lg font-semibold text-text-primary">60 Tage</p>
            <p className="text-xs text-text-muted">
              Pro Kundin max. alle 60 Tage eine Reaktivierungs-Mail
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-text-primary">
                Reaktivierungs-Welle starten
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {preview.eligible === 0
                  ? 'Aktuell keine eligible Kundinnen — der Cron läuft sonst täglich automatisch um 09:00.'
                  : `Schickt eine 'Wir vermissen Dich'-Mail an ${preview.eligible} ${preview.eligible === 1 ? 'Kundin' : 'Kundinnen'} mit Direktlink zur Online-Buchung. Cooldown stellt sicher dass Du keine zweimal in 60 Tagen anschreibst.`}
              </p>
              <p className="mt-2 text-[11px] text-text-muted">
                Die Mails gehen erst raus wenn POSTMARK_TOKEN in den Server-Settings gesetzt ist.
                Sonst werden Events angelegt aber nur geloggt.
              </p>
            </div>
            <form action={runReactivation}>
              <button
                type="submit"
                disabled={preview.eligible === 0}
                className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-text-muted disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Jetzt {preview.eligible} senden →
              </button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
