import Link from 'next/link';
import { Avatar, Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { MergeDialog } from './merge-dialog';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneE164?: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  lifetimeValue: string | number;
  createdAt: string;
}

async function loadAll(): Promise<ClientRow[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: ClientRow[] }>('/v1/clients?limit=5000', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.clients;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

type Reason = 'email' | 'phone' | 'name';

interface DupGroup {
  key: string;
  reason: Reason;
  members: ClientRow[];
}

/**
 * Duplikat-Erkennung. Gruppierung nach:
 * - normalisierter E-Mail (lowercase, trim) — höchste Konfidenz
 * - phoneE164 — zweithöchste Konfidenz
 * - firstName+lastName (case-insensitive, getrimmt) — niedrige Konfidenz,
 *   nur als Hinweis: viele Menschen teilen denselben Namen
 *
 * Echte Merges verschieben wir in eine dedizierte API — hier nur
 * detect + manuell öffnen/bearbeiten.
 */
function detectDuplicates(clients: ClientRow[]): DupGroup[] {
  const byEmail = new Map<string, ClientRow[]>();
  const byPhone = new Map<string, ClientRow[]>();
  const byName = new Map<string, ClientRow[]>();

  for (const c of clients) {
    if (c.email) {
      const k = c.email.trim().toLowerCase();
      if (k) {
        byEmail.set(k, [...(byEmail.get(k) ?? []), c]);
      }
    }
    if (c.phoneE164) {
      byPhone.set(c.phoneE164, [...(byPhone.get(c.phoneE164) ?? []), c]);
    }
    const nk = `${c.firstName.trim().toLowerCase()}|${c.lastName.trim().toLowerCase()}`;
    if (nk !== '|') {
      byName.set(nk, [...(byName.get(nk) ?? []), c]);
    }
  }

  const seenPairs = new Set<string>();
  const groups: DupGroup[] = [];

  const collect = (map: Map<string, ClientRow[]>, reason: Reason, keyPrefix: string): void => {
    for (const [k, members] of map) {
      if (members.length < 2) continue;
      const ids = members
        .map((m) => m.id)
        .sort()
        .join(',');
      if (seenPairs.has(ids)) continue;
      seenPairs.add(ids);
      groups.push({ key: `${keyPrefix}:${k}`, reason, members });
    }
  };

  // Reihenfolge = Konfidenz: email > phone > name. Gleiche ID-Kombi
  // erscheint durch seenPairs nur einmal mit dem konfidentesten Reason.
  collect(byEmail, 'email', 'e');
  collect(byPhone, 'phone', 'p');
  collect(byName, 'name', 'n');
  return groups;
}

const reasonLabel: Record<Reason, string> = {
  email: 'gleiche E-Mail',
  phone: 'gleiche Telefon-Nummer',
  name: 'gleicher Name',
};

const reasonTone: Record<Reason, 'danger' | 'warning' | 'neutral'> = {
  email: 'danger',
  phone: 'warning',
  name: 'neutral',
};

export default async function DuplicatesPage(): Promise<React.JSX.Element> {
  const clients = await loadAll();
  const groups = detectDuplicates(clients);
  const totalDups = groups.reduce((s, g) => s + g.members.length - 1, 0);

  return (
    <div className="w-full p-4 md:p-8">
      <Link
        href="/clients"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Kundinnen
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">CRM</p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Mögliche Duplikate
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {groups.length === 0
            ? 'Keine Duplikate gefunden — saubere Datenbank.'
            : `${groups.length} Gruppen · ${totalDups} vermutlich doppelte Einträge. Prüf pro Gruppe, welche Version die 'richtige' ist — Merge-Action kommt bald.`}
        </p>
      </header>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title="Keine Duplikate"
            description="Schön! Jede Kundin hat eine eindeutige E-Mail, Telefonnummer und Namens-Kombi."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={reasonTone[g.reason]} dot>
                    {reasonLabel[g.reason]}
                  </Badge>
                  <span className="text-xs text-text-muted">{g.members.length} Einträge</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">{g.key.slice(0, 60)}</span>
              </div>
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {(() => {
                    const sorted = [...g.members].sort((a, b) => b.totalVisits - a.totalVisits);
                    const primary = sorted[0];
                    return sorted.map((c, idx) => {
                      const ltv = Number(c.lifetimeValue) || 0;
                      const lastV = c.lastVisitAt
                        ? new Date(c.lastVisitAt).toLocaleDateString('de-CH')
                        : '—';
                      const isPrimary = idx === 0;
                      return (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                        >
                          <Avatar
                            name={`${c.firstName} ${c.lastName}`}
                            size="sm"
                            color="hsl(var(--brand-accent))"
                          />
                          <Link
                            href={`/clients/${c.id}`}
                            className="min-w-0 flex-1 hover:underline"
                          >
                            <div className="font-medium text-text-primary">
                              {isPrimary ? <span className="text-accent">★ </span> : null}
                              {c.firstName} {c.lastName}
                            </div>
                            <div className="text-xs text-text-muted">
                              {c.email ?? '—'}
                              {c.phone ? ` · ${c.phone}` : ''}
                            </div>
                          </Link>
                          <div className="text-right text-xs tabular-nums text-text-muted">
                            <div>
                              <span className="font-semibold text-text-primary">
                                {c.totalVisits}
                              </span>{' '}
                              Besuche
                            </div>
                            <div>
                              {ltv.toFixed(0)} CHF · zuletzt {lastV}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Link href={`/clients/${c.id}`}>
                              <Button variant="secondary" size="sm">
                                Öffnen
                              </Button>
                            </Link>
                            {!isPrimary && primary ? (
                              <MergeDialog primary={primary} duplicate={c} />
                            ) : null}
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
