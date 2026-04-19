import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createService, createCategory } from '../actions';

interface CategoryRow {
  id: string;
  name: string;
}

async function loadCategories(): Promise<CategoryRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ categories: CategoryRow[] }>(
      '/v1/service-categories',
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.categories;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function NewServicePage(): Promise<React.JSX.Element> {
  const categories = await loadCategories();

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/services"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Services
      </Link>
      <header className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Katalog
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Neuer Service</h1>
      </header>

      {categories.length === 0 ? (
        <form
          action={createCategory}
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-sm font-medium text-amber-900">
            Noch keine Kategorie — leg erst eine an.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              name="name"
              required
              placeholder="z. B. Nägel, Wimpern, Brauen"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Kategorie anlegen
            </button>
          </div>
        </form>
      ) : null}

      <form
        action={createService}
        className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            required
            placeholder="Nagel-Modellage Gel"
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Kategorie</span>
          <select
            name="categoryId"
            required
            defaultValue=""
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="">— wählen —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Beschreibung (optional)</span>
          <textarea
            name="description"
            rows={3}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Dauer (Minuten)</span>
            <input
              type="number"
              name="durationMinutes"
              min={5}
              max={600}
              step={5}
              defaultValue={60}
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preis (CHF)</span>
            <input
              type="number"
              name="basePrice"
              min={0}
              step="0.01"
              defaultValue={80}
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bookable" defaultChecked className="h-4 w-4" />
          <span>Online buchbar</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/services"
            className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={categories.length === 0}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Service anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
