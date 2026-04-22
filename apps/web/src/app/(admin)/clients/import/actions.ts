'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ImportResult {
  ok: boolean;
  created?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
  message?: string;
}

/**
 * Parst eine CSV-Zeile mit Unterstützung für quoted fields
 * (Fresha/Phorest-Export enthält Kommata in Namen/Adressen).
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',' || c === ';') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, '');
}

/** Mappt gängige Header-Varianten auf unser Schema. */
const HEADER_MAP: Record<string, string> = {
  firstname: 'firstName',
  first: 'firstName',
  vorname: 'firstName',
  prenom: 'firstName',
  lastname: 'lastName',
  last: 'lastName',
  nachname: 'lastName',
  surname: 'lastName',
  nom: 'lastName',
  email: 'email',
  emailadresse: 'email',
  phone: 'phone',
  mobile: 'phone',
  telefon: 'phone',
  telephone: 'phone',
  handy: 'phone',
  birthday: 'birthday',
  dob: 'birthday',
  dateofbirth: 'birthday',
  geburtstag: 'birthday',
  notes: 'notesInternal',
  notizen: 'notesInternal',
  tags: 'tags',
};

interface ParsedRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthday?: string;
  notesInternal?: string;
  tags: string[];
  marketingOptIn: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  allergies: string[];
}

function parseBirthday(raw: string): string | undefined {
  if (!raw) return undefined;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD.MM.YYYY
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  // DD/MM/YYYY
  const m2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) {
    const [, d, mo, y] = m2;
    return `${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return undefined;
}

// Server-Actions müssen async sein (Next.js-Requirement), auch wenn
// die Arbeit rein sync ist. require-await gilt hier nicht.
// eslint-disable-next-line @typescript-eslint/require-await
export async function parseCsvPreview(
  csv: string,
): Promise<{ rows: ParsedRow[]; headers: string[]; skipped: number }> {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { rows: [], headers: [], skipped: 0 };

  const rawHeaders = parseCsvLine(lines[0]!);
  const headerKeys = rawHeaders.map(
    (h) => HEADER_MAP[normalizeHeader(h)] ?? null,
  );

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const record: Record<string, string> = {};
    for (let j = 0; j < headerKeys.length; j++) {
      const key = headerKeys[j];
      if (!key) continue;
      record[key] = cells[j] ?? '';
    }
    const firstName = record.firstName?.trim();
    const lastName = record.lastName?.trim();
    if (!firstName || !lastName) {
      skipped++;
      continue;
    }
    rows.push({
      firstName,
      lastName,
      email: record.email?.trim() || undefined,
      phone: record.phone?.trim() || undefined,
      birthday: parseBirthday(record.birthday ?? ''),
      notesInternal: record.notesInternal?.trim() || undefined,
      tags: record.tags
        ? record.tags
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 10)
        : [],
      marketingOptIn: false,
      smsOptIn: false,
      emailOptIn: false,
      allergies: [],
    });
  }
  return { rows, headers: rawHeaders, skipped };
}

export async function runImport(form: FormData): Promise<ImportResult> {
  const csv = form.get('csv')?.toString() ?? '';
  if (!csv.trim()) return { ok: false, message: 'CSV ist leer.' };

  const { rows, skipped: invalidRows } = await parseCsvPreview(csv);
  if (rows.length === 0) {
    return {
      ok: false,
      message:
        'Keine gültigen Zeilen gefunden. Prüfe die Header-Zeile (firstName, lastName, email, phone …).',
    };
  }

  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{
      created: number;
      skipped: number;
      errors: { row: number; message: string }[];
    }>('/v1/clients/import', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { clients: rows },
    });
    revalidatePath('/clients');
    return {
      ok: true,
      created: res.created,
      skipped: res.skipped + invalidRows,
      errors: res.errors,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.problem?.title ?? err.message };
    }
    throw err;
  }
}

// redirect() throws (typed never), daher kein await nötig.
// eslint-disable-next-line @typescript-eslint/require-await
export async function redirectToClients(): Promise<void> {
  redirect('/clients');
}
