/**
 * Minimal-Templates für Outbox-Reminders. HTML bewusst inline + dünn —
 * kein MJML-Setup im MVP. Aufwendigere Templates (Mangomint-Style) kommen
 * separat sobald Branding-Felder pro Tenant aufgeschlagen sind.
 */

export interface ApptForEmail {
  startAt: Date;
  endAt?: Date;
  location: { name: string };
  staff: { firstName: string };
  items: Array<{ service: { name: string }; optionLabels?: string[] }>;
}

export interface ClientForEmail {
  firstName: string | null;
  email: string | null;
}

export interface TenantForEmail {
  name: string;
  slug: string;
}

const FORMAT_DE_CH = new Intl.DateTimeFormat('de-CH', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Zurich',
});

function fmt(d: Date): string {
  return FORMAT_DE_CH.format(d);
}

function services(items: ApptForEmail['items']): string {
  return items
    .map((i) => {
      const labels = (i.optionLabels ?? []).filter(Boolean);
      return labels.length > 0 ? `${i.service.name} · ${labels.join(' · ')}` : i.service.name;
    })
    .join(', ');
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(title: string, body: string, tenant: TenantForEmail): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;background:#faf7f3;font-family:-apple-system,'Segoe UI',sans-serif;color:#2a2522;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.04);">
        <tr><td style="font-size:14px;color:#7a6f68;text-transform:uppercase;letter-spacing:.15em;font-weight:600;">
          ${escape(tenant.name)}
        </td></tr>
        <tr><td style="padding-top:8px;font-size:22px;font-weight:600;line-height:1.3;">${escape(title)}</td></tr>
        <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#3a322d;">${body}</td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid #ece5dd;font-size:12px;color:#9a8e85;">
          ${escape(tenant.name)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function confirmationEmail(
  appt: ApptForEmail,
  client: ClientForEmail,
  tenant: TenantForEmail,
): { subject: string; html: string; text: string } {
  const greeting = client.firstName ? `Hallo ${client.firstName},` : 'Hallo,';
  const when = fmt(appt.startAt);
  const svc = services(appt.items);
  const subject = `Termin bestätigt — ${when}`;
  const text = `${greeting}

Dein Termin bei ${tenant.name} ist bestätigt:

  ${svc}
  am ${when}
  bei ${appt.staff.firstName}
  ${appt.location.name}

Wir freuen uns auf Dich.

— ${tenant.name}`;
  const html = shell(
    'Dein Termin ist bestätigt',
    `<p>${escape(greeting)}</p>
     <p>Dein Termin bei <strong>${escape(tenant.name)}</strong> ist bestätigt:</p>
     <p style="background:#f5efe8;border-radius:8px;padding:16px;">
       <strong>${escape(svc)}</strong><br>
       ${escape(when)}<br>
       bei ${escape(appt.staff.firstName)}<br>
       ${escape(appt.location.name)}
     </p>
     <p>Wir freuen uns auf Dich.</p>`,
    tenant,
  );
  return { subject, html, text };
}

export function reminder24hEmail(
  appt: ApptForEmail,
  client: ClientForEmail,
  tenant: TenantForEmail,
): { subject: string; html: string; text: string } {
  const greeting = client.firstName ? `Hallo ${client.firstName},` : 'Hallo,';
  const when = fmt(appt.startAt);
  const svc = services(appt.items);
  const subject = `Erinnerung: Dein Termin morgen — ${when}`;
  const text = `${greeting}

kurze Erinnerung: morgen hast Du Deinen Termin bei ${tenant.name}.

  ${svc}
  ${when}
  bei ${appt.staff.firstName}
  ${appt.location.name}

Bis morgen.

— ${tenant.name}`;
  const html = shell(
    'Erinnerung an Deinen Termin',
    `<p>${escape(greeting)}</p>
     <p>kurze Erinnerung — Dein Termin bei <strong>${escape(tenant.name)}</strong> ist <strong>morgen</strong>:</p>
     <p style="background:#f5efe8;border-radius:8px;padding:16px;">
       <strong>${escape(svc)}</strong><br>
       ${escape(when)}<br>
       bei ${escape(appt.staff.firstName)}<br>
       ${escape(appt.location.name)}
     </p>
     <p>Bis morgen.</p>`,
    tenant,
  );
  return { subject, html, text };
}

export function magicLinkEmail(
  client: ClientForEmail,
  tenant: TenantForEmail,
  loginUrl: string,
): { subject: string; html: string; text: string } {
  const greeting = client.firstName ? `Hallo ${client.firstName},` : 'Hallo,';
  const subject = `Dein Login-Link für ${tenant.name}`;
  const text = `${greeting}

hier ist dein Login-Link für ${tenant.name}:

${loginUrl}

Der Link ist 30 Minuten gültig und kann nur einmal verwendet werden.
Falls Du keinen Login angefordert hast, ignoriere diese Mail.

— ${tenant.name}`;
  const html = shell(
    'Dein Login-Link',
    `<p>${escape(greeting)}</p>
     <p>hier ist Dein Login-Link für <strong>${escape(tenant.name)}</strong>:</p>
     <p style="text-align:center;padding:24px 0;">
       <a href="${escape(loginUrl)}" style="display:inline-block;background:#2a2522;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
         Jetzt einloggen
       </a>
     </p>
     <p style="font-size:13px;color:#7a6f68;">Falls der Button nicht klappt: ${escape(loginUrl)}</p>
     <p style="font-size:13px;color:#7a6f68;">Der Link ist 30 Minuten gültig und kann nur einmal verwendet werden. Falls Du keinen Login angefordert hast, ignoriere diese Mail.</p>`,
    tenant,
  );
  return { subject, html, text };
}

export function winbackEmail(
  client: ClientForEmail,
  tenant: TenantForEmail,
  bookingUrl: string,
): { subject: string; html: string; text: string } {
  const greeting = client.firstName ? `Hallo ${client.firstName},` : 'Hallo,';
  const subject = `Wir vermissen Dich bei ${tenant.name}`;
  const text = `${greeting}

es ist eine Weile her, dass Du bei uns warst — wir würden uns freuen,
Dich wieder zu sehen.

Termin direkt online buchen: ${bookingUrl}

— ${tenant.name}`;
  const html = shell(
    'Wir vermissen Dich',
    `<p>${escape(greeting)}</p>
     <p>es ist eine Weile her, dass Du bei <strong>${escape(tenant.name)}</strong> warst — wir würden uns freuen, Dich wieder zu sehen.</p>
     <p style="text-align:center;padding:24px 0;">
       <a href="${escape(bookingUrl)}" style="display:inline-block;background:#2a2522;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
         Termin buchen
       </a>
     </p>
     <p style="font-size:13px;color:#7a6f68;">Falls der Button nicht klappt: ${escape(bookingUrl)}</p>`,
    tenant,
  );
  return { subject, html, text };
}

export function cancelEmail(
  appt: ApptForEmail,
  client: ClientForEmail,
  tenant: TenantForEmail,
): { subject: string; html: string; text: string } {
  const greeting = client.firstName ? `Hallo ${client.firstName},` : 'Hallo,';
  const when = fmt(appt.startAt);
  const subject = `Termin storniert — ${when}`;
  const text = `${greeting}

Dein Termin bei ${tenant.name} am ${when} wurde storniert.

Falls Du einen neuen Termin möchtest, melde Dich gerne.

— ${tenant.name}`;
  const html = shell(
    'Dein Termin wurde storniert',
    `<p>${escape(greeting)}</p>
     <p>Dein Termin bei <strong>${escape(tenant.name)}</strong> am <strong>${escape(when)}</strong> wurde storniert.</p>
     <p>Falls Du einen neuen Termin möchtest, melde Dich gerne.</p>`,
    tenant,
  );
  return { subject, html, text };
}
