import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createService, createCategory } from '../actions';
import { TemplateCard } from './template-card';

interface CategoryRow {
  id: string;
  name: string;
}

async function loadCategories(): Promise<CategoryRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ categories: CategoryRow[] }>('/v1/service-categories', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.categories;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

interface Template {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
}

// Visuelle Karten — was Lorenc/Stylistin auf einen Blick erkennt.
// Klick → Service mit Default-Preisen + Varianten anlegen, Edit-Page öffnet
// sich automatisch.
const TEMPLATES: Template[] = [
  {
    key: 'nails-neueset',
    emoji: '💅',
    title: 'Nails — Neues Set',
    subtitle: 'Gel/Acryl × Kurz/Mittel/Lang',
    badge: 'ab CHF 80 · 60 Min',
  },
  {
    key: 'nails-auffüllen',
    emoji: '✨',
    title: 'Nails — Auffüllen',
    subtitle: 'Gel/Acryl × Kurz/Mittel/Lang',
    badge: 'ab CHF 70 · 60 Min',
  },
  {
    key: 'pedi-basis',
    emoji: '🦶',
    title: 'Pediküre Basis',
    subtitle: 'Nagelpflege, Feilen, Lack',
    badge: 'CHF 39 · 30 Min',
  },
  {
    key: 'pedi-spa',
    emoji: '🛁',
    title: 'Pediküre Spa',
    subtitle: 'Wasserbad, Hornhaut, Massage',
    badge: 'CHF 59 · 60 Min',
  },
  {
    key: 'haarschnitt',
    emoji: '✂️',
    title: 'Haarschnitt',
    subtitle: 'Kurz/Mittel/Lang',
    badge: 'ab CHF 65 · 60 Min',
  },
  {
    key: 'färben',
    emoji: '🎨',
    title: 'Färben',
    subtitle: 'Wurzel / Komplett / Highlights',
    badge: 'ab CHF 120 · 90 Min',
  },
  {
    key: 'balayage',
    emoji: '🌅',
    title: 'Balayage',
    subtitle: 'Hand-gemalte Highlights',
    badge: 'CHF 180 · 150 Min',
  },
  {
    key: 'lashes',
    emoji: '👁️',
    title: 'Wimpern',
    subtitle: 'Classic / Volume / Mega',
    badge: 'ab CHF 120 · 90 Min',
  },
];

export default async function NewServicePage(): Promise<React.JSX.Element> {
  const categories = await loadCategories();

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Link
        href="/services"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Services
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Katalog</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Neue Behandlung
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Wähle eine Vorlage — Du kannst Preise &amp; Dauer danach anpassen.
        </p>
      </header>

      {/* Template-Picker: 8 visuelle Karten */}
      <section className="mb-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Schnellstart-Vorlagen
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.key}
              templateKey={t.key}
              emoji={t.emoji}
              title={t.title}
              subtitle={t.subtitle}
              badge={t.badge}
            />
          ))}
        </div>
      </section>

      {/* Custom — manueller Service */}
      <section>
        <details className="rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              <span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Eigene Behandlung
                </span>
                <span className="mt-1 block text-base font-semibold">
                  Manuell anlegen — leeres Formular
                </span>
              </span>
              <span aria-hidden className="text-text-muted">
                ▾
              </span>
            </span>
          </summary>

          <div className="border-t border-border p-5">
            {categories.length === 0 ? (
              <Card className="mb-5 border-l-4 border-l-warning bg-warning/5">
                <CardBody>
                  <form action={createCategory} className="space-y-3">
                    <p className="text-sm font-medium text-text-primary">
                      Noch keine Kategorie — leg erst eine an.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        name="name"
                        required
                        placeholder="z. B. Nägel, Wimpern, Brauen"
                        className="flex-1"
                      />
                      <Button type="submit" variant="accent">
                        Kategorie anlegen
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : null}

            <form action={createService} className="space-y-5">
              <Field label="Name" required>
                <Input name="name" required placeholder="z. B. Augenbrauen-Wax" />
              </Field>

              <Field label="Kategorie" required>
                <Select name="categoryId" required defaultValue="">
                  <option value="">— wählen —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Beschreibung" hint="Optional — wird auf der Booking-Seite angezeigt.">
                <Textarea name="description" rows={3} />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Dauer (Minuten)" required>
                  <Input
                    type="number"
                    name="durationMinutes"
                    min={5}
                    max={600}
                    step={5}
                    defaultValue={60}
                    required
                  />
                </Field>
                <Field label="Preis (CHF)" required>
                  <Input
                    type="number"
                    name="basePrice"
                    min={0}
                    step="0.01"
                    defaultValue={80}
                    required
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" name="bookable" defaultChecked className="h-4 w-4" />
                <span>Online buchbar</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Link href="/services">
                  <Button type="button" variant="ghost">
                    Abbrechen
                  </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={categories.length === 0}>
                  Service anlegen
                </Button>
              </div>
            </form>
          </div>
        </details>
      </section>
    </div>
  );
}
