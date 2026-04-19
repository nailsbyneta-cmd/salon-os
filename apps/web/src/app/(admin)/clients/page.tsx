import Link from 'next/link';
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
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            CRM
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Kunden</h1>
        </div>
        <form className="flex gap-2" method="get">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Suchen…"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Suchen
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-neutral-200">
        {clients.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-neutral-500">
              Keine Kundinnen gefunden. Lege neue an oder importiere via CSV.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Letzter Besuch</th>
                <th className="px-4 py-3">Besuche</th>
                <th className="px-4 py-3">Tags</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.email ?? '—'}
                    {c.phone ? <span className="ml-2 text-neutral-400">· {c.phone}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.lastVisitAt
                      ? new Date(c.lastVisitAt).toLocaleDateString('de-CH')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.totalVisits}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
