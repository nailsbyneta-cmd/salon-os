import Link from 'next/link';
import { Card, CardBody, Field, Input } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { saveLoyaltyProgram } from './actions';

interface Program {
  id: string;
  name: string;
  active: boolean;
  earnRule: 'per_appointment' | 'per_chf';
  earnPerUnit: number;
  redeemThreshold: number;
  rewardValueChf: string | number;
  rewardLabel: string;
}

async function loadProgram(): Promise<Program | null> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ program: Program | null }>('/v1/loyalty/program', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.program;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function LoyaltyProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const program = await loadProgram();

  return (
    <div className="w-full p-4 md:p-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        ← Zurück zu Einstellungen
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
          Einstellungen
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Loyalty-Programm
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Stempelkarten-System: pro Termin oder pro CHF Umsatz Stempel sammeln, ab N Stempeln gibt
          es einen Reward.
        </p>
      </header>

      {sp.saved ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Gespeichert.
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form action={saveLoyaltyProgram} className="space-y-4">
            <Field label="Programm-Name" required>
              <Input
                required
                name="name"
                placeholder="z.B. Beautyneta Treue-Stempel"
                defaultValue={program?.name ?? 'Treue-Stempel'}
              />
            </Field>

            <Field label="Stempel-Regel" required>
              <select
                name="earnRule"
                defaultValue={program?.earnRule ?? 'per_appointment'}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="per_appointment">Pro Termin (1 Stempel pro Besuch)</option>
                <option value="per_chf">Pro CHF Umsatz (z.B. 1 Stempel pro 50 CHF)</option>
              </select>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Pro X Einheit (Termin/CHF)" required>
                <Input
                  required
                  name="earnPerUnit"
                  type="number"
                  step={1}
                  min={1}
                  defaultValue={program?.earnPerUnit ?? 1}
                />
              </Field>
              <Field label="Schwelle für Reward (Stempel)" required>
                <Input
                  required
                  name="redeemThreshold"
                  type="number"
                  step={1}
                  min={1}
                  defaultValue={program?.redeemThreshold ?? 10}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Reward-Bezeichnung">
                <Input
                  name="rewardLabel"
                  placeholder="Gratis Maniküre / 20% Discount / …"
                  defaultValue={program?.rewardLabel ?? 'Gratis-Service'}
                />
              </Field>
              <Field label="Reward-Wert in CHF (Info)">
                <Input
                  name="rewardValueChf"
                  type="number"
                  step={1}
                  min={0}
                  defaultValue={Number(program?.rewardValueChf ?? 0)}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                defaultChecked={program?.active ?? true}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="active" className="text-sm text-text-primary">
                Programm aktiv (auto-Award beim COMPLETED-Status)
              </label>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
            >
              Speichern
            </button>
          </form>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="space-y-2">
          <h3 className="text-sm font-semibold">So funktioniert's</h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-text-secondary">
            <li>
              Beim ersten <strong>COMPLETED</strong>-Status eines Termins werden Stempel automatisch
              gutgeschrieben (idempotent — kein Doppel-Award).
            </li>
            <li>Manueller Award/Adjust ist auf der Kunden-Detail-Seite verfügbar.</li>
            <li>Stempel-Verlauf pro Kundin sichtbar, mit Datum + Grund.</li>
            <li>
              Reward-Einlösung verbraucht <code>redeemThreshold</code> Stempel auf einmal.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
