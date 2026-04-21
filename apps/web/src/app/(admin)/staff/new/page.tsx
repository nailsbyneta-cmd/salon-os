import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select } from '@salon-os/ui';
import { createStaff } from '../actions';

export default function NewStaffPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/staff"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Team
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Team
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neue Mitarbeiterin
        </h1>
      </header>

      <Card>
        <CardBody>
          <form action={createStaff} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vorname" required>
                <Input name="firstName" required />
              </Field>
              <Field label="Nachname" required>
                <Input name="lastName" required />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="E-Mail" required>
                <Input type="email" name="email" required />
              </Field>
              <Field label="Telefon" hint="Optional">
                <Input type="tel" name="phone" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Rolle">
                <Select name="role" defaultValue="STYLIST">
                  <option value="OWNER">Inhaberin</option>
                  <option value="MANAGER">Managerin</option>
                  <option value="FRONT_DESK">Empfang</option>
                  <option value="STYLIST">Stylistin</option>
                  <option value="BOOTH_RENTER">Mieterin</option>
                  <option value="TRAINEE">Auszubildende</option>
                  <option value="ASSISTANT">Assistentin</option>
                </Select>
              </Field>
              <Field label="Anstellungsart">
                <Select name="employmentType" defaultValue="EMPLOYEE">
                  <option value="EMPLOYEE">Angestellt</option>
                  <option value="CONTRACTOR">Freie Mitarbeit</option>
                  <option value="BOOTH_RENTER">Mieterin</option>
                  <option value="COMMISSION">Provision</option>
                  <option value="OWNER">Inhaberin</option>
                </Select>
              </Field>
            </div>

            <Field label="Farbe im Kalender">
              <input
                type="color"
                name="color"
                defaultValue="#E91E63"
                className="h-10 w-20 cursor-pointer rounded-sm border border-border"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/staff">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Anlegen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
