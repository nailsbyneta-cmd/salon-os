import { Button, Card, CardBody, Field, Input, Textarea } from '@salon-os/ui';

interface Props {
  action: (form: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  defaults?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    birthday?: string | null;
    notes?: string | null;
    tags?: string[];
    emailOptIn?: boolean;
    smsOptIn?: boolean;
  };
  cancelHref: string;
}

export function ClientForm({ action, mode, defaults, cancelHref }: Props): React.JSX.Element {
  return (
    <Card>
      <CardBody>
        <form action={action} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vorname" required>
              <Input name="firstName" required defaultValue={defaults?.firstName ?? ''} />
            </Field>
            <Field label="Nachname" required>
              <Input name="lastName" required defaultValue={defaults?.lastName ?? ''} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="E-Mail">
              <Input type="email" name="email" defaultValue={defaults?.email ?? ''} />
            </Field>
            <Field label="Telefon">
              <Input type="tel" name="phone" defaultValue={defaults?.phone ?? ''} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Geburtstag" hint="Für Birthday-Kampagnen.">
              <Input
                type="date"
                name="birthday"
                defaultValue={defaults?.birthday?.slice(0, 10) ?? ''}
              />
            </Field>
            <Field label="Tags" hint="Komma-getrennt (max. 10)">
              <Input
                name="tags"
                placeholder="VIP, Stammkundin, Allergie: Nüsse"
                defaultValue={defaults?.tags?.join(', ') ?? ''}
              />
            </Field>
          </div>

          <Field
            label="Interne Notiz"
            hint="Nur für Team sichtbar. Allergien, Vorlieben, spezielle Wünsche."
          >
            <Textarea name="notes" rows={3} defaultValue={defaults?.notes ?? ''} />
          </Field>

          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Marketing-Opt-In (DSGVO)
            </legend>
            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="emailOptIn"
                  defaultChecked={defaults?.emailOptIn ?? false}
                  className="h-4 w-4"
                />
                <span>E-Mail-Werbung ok</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="smsOptIn"
                  defaultChecked={defaults?.smsOptIn ?? false}
                  className="h-4 w-4"
                />
                <span>SMS/WhatsApp-Werbung ok</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-2">
            <a
              href={cancelHref}
              className="inline-flex h-10 items-center px-4 text-sm text-text-secondary hover:text-text-primary"
            >
              Abbrechen
            </a>
            <Button type="submit" variant="primary">
              {mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
