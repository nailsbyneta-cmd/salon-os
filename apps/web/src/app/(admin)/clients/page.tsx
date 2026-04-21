import Link from 'next/link';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
} from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  tags: string[];
}

async function loadClients(q?: string): Promise<ClientRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ clients: ClientRow[] }>(
      `/v1/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.clients;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const { q } = await searchParams;
  const clients = await loadClients(q);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            CRM
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Kundinnen
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {clients.length} {clients.length === 1 ? 'Kundin' : 'Kundinnen'} im System
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex gap-2" method="get">
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Suchen…"
              className="w-56"
            />
            <Button type="submit" variant="secondary">
              Suchen
            </Button>
          </form>
          <Link
            href="/clients/import"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-surface-raised"
          >
            ↑ Import
          </Link>
          <a
            href="/api/clients/export"
            download
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-surface-raised"
          >
            ↓ CSV
          </a>
          <Link href="/clients/new">
            <Button
              variant="primary"
              iconLeft={<span className="text-base leading-none">+</span>}
            >
              Neue Kundin
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            title={q ? `Keine Treffer für „${q}"` : 'Noch keine Kundinnen'}
            description="Lege neue an oder importiere eine CSV aus Phorest/Fresha."
          />
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-5">
                    Kontakt
                  </th>
                  <th className="hidden px-4 py-3 md:table-cell md:px-5">
                    Letzter Besuch
                  </th>
                  <th className="px-4 py-3 text-right sm:px-5">Besuche</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <Link
                        href={`/clients/${c.id}`}
                        className="flex items-center gap-3 font-medium text-text-primary hover:underline"
                      >
                        <Avatar
                          name={`${c.firstName} ${c.lastName}`}
                          size="sm"
                          color="hsl(var(--brand-accent))"
                        />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {c.firstName} {c.lastName}
                          </span>
                          {/* Kontakt auf Mobile unter den Namen */}
                          <span className="block truncate text-xs font-normal text-text-muted sm:hidden">
                            {c.email ?? c.phone ?? '—'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-text-secondary sm:table-cell sm:px-5">
                      {c.email ?? '—'}
                      {c.phone ? (
                        <span className="ml-2 text-text-muted">· {c.phone}</span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-text-secondary md:table-cell md:px-5">
                      {c.lastVisitAt
                        ? new Date(c.lastVisitAt).toLocaleDateString('de-CH')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium sm:px-5">
                      {c.totalVisits}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell lg:px-5">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Badge key={t} tone="neutral">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
