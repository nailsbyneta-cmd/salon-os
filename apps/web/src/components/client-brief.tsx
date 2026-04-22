import { Badge, Card, CardBody } from '@salon-os/ui';
import { computeLoyalty } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ClientFull {
  id: string;
  firstName: string;
  totalVisits: number;
  lifetimeValue: number | string;
  lastVisitAt: string | null;
  noShowRisk: number | null;
  allergies: string[];
  tags: string[];
  preferredStaffId: string | null;
}

async function loadClient(id: string): Promise<ClientFull | null> {
  const ctx = getCurrentTenant();
  try {
    return await apiFetch<ClientFull>(`/v1/clients/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function ordinal(n: number): string {
  return `${n}.`;
}

function noShowTone(risk: number): {
  tone: 'success' | 'warning' | 'danger';
  label: string;
} {
  if (risk < 15) return { tone: 'success', label: 'niedrig' };
  if (risk < 40) return { tone: 'warning', label: 'mittel' };
  return { tone: 'danger', label: 'hoch' };
}

/**
 * Heuristische Kurzinfo-Karte (Diff #7).
 * Zeigt der Mitarbeiterin die wichtigsten Beziehungssignale BEVOR sie
 * den Termin beginnt: Besuchsnummer, Letzter Besuch, Loyalty, Risiko,
 * Allergien, Stammstilistin.
 */
export async function ClientBrief({
  clientId,
  appointmentStaffId,
}: {
  clientId: string;
  appointmentStaffId?: string;
}): Promise<React.JSX.Element | null> {
  const client = await loadClient(clientId);
  if (!client) return null;

  const visits = client.totalVisits;
  const lifetime = Number(client.lifetimeValue);
  const loyalty = computeLoyalty(lifetime);

  const lastSeenDays = client.lastVisitAt ? daysAgo(client.lastVisitAt) : null;
  const isFirst = visits === 0 || !client.lastVisitAt;
  const nextOrdinal = ordinal(visits + 1);

  const risk = client.noShowRisk;
  const riskInfo = typeof risk === 'number' ? noShowTone(risk) : null;

  const isStammstilistin = appointmentStaffId && client.preferredStaffId === appointmentStaffId;

  return (
    <Card elevation="flat" className="mb-6 bg-accent/5">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Client-Brief
          </span>
          <Badge tone="accent" dot>
            {loyalty.tier.label}
          </Badge>
          {isFirst ? (
            <Badge tone="info">Erster Besuch</Badge>
          ) : (
            <Badge tone="neutral">{nextOrdinal} Besuch</Badge>
          )}
          {riskInfo && risk !== null && risk >= 15 ? (
            <Badge tone={riskInfo.tone}>
              No-Show {risk}% · {riskInfo.label}
            </Badge>
          ) : null}
          {isStammstilistin ? <Badge tone="success">Stammstilistin</Badge> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              Letzter Besuch
            </div>
            <div className="mt-0.5 font-medium text-text-primary">
              {lastSeenDays === null
                ? '—'
                : lastSeenDays === 0
                  ? 'heute'
                  : lastSeenDays === 1
                    ? 'gestern'
                    : `vor ${lastSeenDays} Tagen`}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Lifetime</div>
            <div className="mt-0.5 font-medium tabular-nums text-text-primary">
              {lifetime.toLocaleString('de-CH', {
                maximumFractionDigits: 0,
              })}{' '}
              CHF
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              Tier-Fortschritt
            </div>
            <div className="mt-0.5 font-medium text-text-primary">
              {loyalty.nextTier
                ? `noch ${loyalty.toNextCHF!.toLocaleString('de-CH', {
                    maximumFractionDigits: 0,
                  })} CHF → ${loyalty.nextTier.label}`
                : 'Max. Tier erreicht'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Benefit</div>
            <div className="mt-0.5 font-medium text-text-primary">{loyalty.tier.benefitHint}</div>
          </div>
        </div>

        {client.allergies.length > 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs">
            <span className="font-semibold text-warning">⚠ Allergien:</span>
            <span className="text-text-primary">{client.allergies.join(', ')}</span>
          </div>
        ) : null}

        {client.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {client.tags.slice(0, 5).map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
