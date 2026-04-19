import Link from 'next/link';
import { createStaff } from '../actions';

export default function NewStaffPage(): React.JSX.Element {
  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/staff"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Team
      </Link>
      <header className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Team
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Neue Mitarbeiterin
        </h1>
      </header>

      <form
        action={createStaff}
        className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Vorname</span>
            <input
              name="firstName"
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nachname</span>
            <input
              name="lastName"
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">E-Mail</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Telefon (optional)</span>
            <input
              type="tel"
              name="phone"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Rolle</span>
            <select
              name="role"
              defaultValue="STYLIST"
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              <option value="OWNER">Inhaberin</option>
              <option value="MANAGER">Managerin</option>
              <option value="FRONT_DESK">Empfang</option>
              <option value="STYLIST">Stylistin</option>
              <option value="BOOTH_RENTER">Mieterin</option>
              <option value="TRAINEE">Auszubildende</option>
              <option value="ASSISTANT">Assistentin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Anstellungsart</span>
            <select
              name="employmentType"
              defaultValue="EMPLOYEE"
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              <option value="EMPLOYEE">Angestellt</option>
              <option value="CONTRACTOR">Freie Mitarbeit</option>
              <option value="BOOTH_RENTER">Mieterin</option>
              <option value="COMMISSION">Provision</option>
              <option value="OWNER">Inhaberin</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Farbe im Kalender</span>
          <input
            type="color"
            name="color"
            defaultValue="#E91E63"
            className="h-10 w-20 cursor-pointer rounded-md border border-neutral-300"
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/staff"
            className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
