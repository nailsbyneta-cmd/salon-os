import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { issueGiftCard } from '../actions';

export default function NewGiftCardPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/gift-cards"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Gutscheine
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">Gift-Cards</p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Neuen Gutschein ausstellen
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Der Code wird automatisch generiert. Teile ihn mit der Empfängerin via iMessage, WhatsApp
          oder Mail.
        </p>
      </header>

      <Card>
        <CardBody>
          <form action={issueGiftCard} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Betrag (CHF)" required>
                <Input type="number" name="amount" min={10} step="10" defaultValue={100} required />
              </Field>
              <Field label="Gültigkeit">
                <Select name="expiresInDays" defaultValue="365">
                  <option value="180">6 Monate</option>
                  <option value="365">12 Monate</option>
                  <option value="730">24 Monate</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Empfängerin (optional)">
                <Input name="recipientName" placeholder="z. B. Sarah Müller" />
              </Field>
              <Field label="E-Mail (optional)">
                <Input type="email" name="recipientEmail" placeholder="sarah@…" />
              </Field>
            </div>

            <Field
              label="Persönliche Nachricht (optional)"
              hint="Zeigt der Empfängerin wer's schenkt."
            >
              <Textarea
                name="message"
                rows={3}
                placeholder="Liebe Sarah, alles Gute zum Geburtstag — dein Balayage ist hiermit schon gebucht 💛"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/gift-cards">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Ausstellen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
