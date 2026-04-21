import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
  Textarea,
} from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { updateStaff } from '../actions';

interface StaffFull {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  role: string;
  employmentType: string;
  color: string | null;
  photoUrl: string | null;
  bio: string | null;
  active: boolean;
}

async function load(id: string): Promise<StaffFull | null> {
  const ctx = getCurrentTenant();
  try {
    return await apiFetch<StaffFull>(`/v1/staff/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const s = await load(id);
  if (!s) notFound();

  const save = updateStaff.bind(null, id);
  const displayName = s.displayName ?? `${s.firstName} ${s.lastName}`;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link
        href="/staff"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Team
      </Link>

      <header className="mb-6 mt-4 flex flex-wrap items-center gap-4">
        <Avatar name={displayName} color={s.color} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Profil
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {displayName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge tone={s.active ? 'success' : 'neutral'} dot>
              {s.active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
            <Badge tone="neutral">{s.role}</Badge>
          </div>
        </div>
        <Link href={`/staff/${s.id}/shifts`}>
          <Button variant="secondary" size="sm">
            Arbeitszeiten →
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody>
          <form action={save} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Vorname" required>
                <Input
                  name="firstName"
                  defaultValue={s.firstName}
                  required
                />
              </Field>
              <Field label="Nachname" required>
                <Input
                  name="lastName"
                  defaultValue={s.lastName}
                  required
                />
              </Field>
            </div>

            <Field
              label="Anzeigename (optional)"
              hint="Fällt zurück auf Vor + Nachname wenn leer"
            >
              <Input
                name="displayName"
                defaultValue={s.displayName ?? ''}
                placeholder={`${s.firstName} ${s.lastName}`}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="E-Mail" required>
                <Input
                  type="email"
                  name="email"
                  defaultValue={s.email}
                  required
                />
              </Field>
              <Field label="Telefon">
                <Input
                  type="tel"
                  name="phone"
                  defaultValue={s.phone ?? ''}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Rolle" required>
                <Select name="role" defaultValue={s.role} required>
                  <option value="OWNER">Inhaberin</option>
                  <option value="MANAGER">Managerin</option>
                  <option value="STYLIST">Stylistin</option>
                  <option value="ASSISTANT">Assistentin</option>
                  <option value="APPRENTICE">Auszubildende</option>
                </Select>
              </Field>
              <Field label="Anstellung" required>
                <Select
                  name="employmentType"
                  defaultValue={s.employmentType}
                  required
                >
                  <option value="EMPLOYEE">Angestellt</option>
                  <option value="CONTRACTOR">Freelance</option>
                  <option value="BOOTH_RENTER">Stuhlmiete</option>
                  <option value="COMMISSION">Provision</option>
                  <option value="OWNER">Inhaberin</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Kalender-Farbe"
                hint="HEX wie #e91e63 — Farbstreifen in Kalender-Karten"
              >
                <Input
                  name="color"
                  defaultValue={s.color ?? ''}
                  placeholder="#e91e63"
                />
              </Field>
              <Field label="Foto-URL" hint="Erscheint auf Public-Buchungs-Seite">
                <Input
                  name="photoUrl"
                  type="url"
                  defaultValue={s.photoUrl ?? ''}
                  placeholder="https://…/foto.jpg"
                />
              </Field>
            </div>

            <Field
              label="Kurz-Bio"
              hint="Zeigt auf Public-Buchungs-Seite unter „Unser Team""
            >
              <Textarea
                name="bio"
                rows={3}
                defaultValue={s.bio ?? ''}
                placeholder="Seit 2019 bei Beautycenter, Expertin für Brauen-Laminierung…"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="active"
                defaultChecked={s.active}
                className="h-4 w-4 accent-accent"
              />
              <span>
                Aktiv — erscheint in Kalender-Spalten + Online-Booking
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/staff">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Speichern
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
