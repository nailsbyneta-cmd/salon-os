import Link from 'next/link';
import { Avatar } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  lastVisitAt: string | null;
}

async function load(q?: string): Promise<Client[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: Client[] }>(
      `/v1/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.clients;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function MobileClients({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const { q } = await searchParams;
  const clients = await load(q);

  return (
    <div>
      <header className="px-5 pt-8 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted">CRM</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Kundinnen</h1>
      </header>

      <form
        method="get"
        className="sticky top-0 z-10 -mx-0 border-b border-border bg-background/80 px-5 py-3 backdrop-blur"
      >
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Suchen…"
          className="h-11 w-full rounded-md border border-border bg-surface px-4 text-base"
        />
      </form>

      <ul className="divide-y divide-border">
        {clients.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-text-muted">
            {q ? `Keine Treffer für „${q}"` : 'Keine Kundinnen.'}
          </li>
        ) : null}
        {clients.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clients/${c.id}`}
              className="flex items-center gap-3 px-5 py-3 active:bg-surface-raised transition-colors"
            >
              <Avatar
                name={`${c.firstName} ${c.lastName}`}
                size="md"
                color="hsl(var(--brand-accent))"
                vip={c.totalVisits >= 10}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {c.firstName} {c.lastName}
                </div>
                <div className="text-xs text-text-muted truncate">{c.phone ?? c.email ?? '—'}</div>
              </div>
              <div className="text-right text-[10px] text-text-muted">
                <div className="font-semibold tabular-nums text-text-primary">{c.totalVisits}×</div>
                {c.lastVisitAt ? (
                  <div>
                    {new Date(c.lastVisitAt).toLocaleDateString('de-CH', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </div>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
