import { Injectable, Logger } from '@nestjs/common';

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content. */
  content: string;
  contentType: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional override; otherwise uses MAIL_FROM env. */
  from?: string;
  /** Telemetry tag for tracking (e.g. tenantId, event type). */
  tag?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Minimal Postmark adapter. Activated only if POSTMARK_TOKEN is set.
 * Sonst log-only Mode (App startet, Reminders gehen nirgendwo hin —
 * Outbox markiert sie trotzdem als DONE damit sie nicht in Endlos-Retry).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly token = process.env['POSTMARK_TOKEN'];
  private readonly defaultFrom = process.env['MAIL_FROM'] ?? 'no-reply@salon-os.app';

  get configured(): boolean {
    return Boolean(this.token);
  }

  async send(msg: EmailMessage): Promise<EmailResult> {
    if (!this.token) {
      this.logger.warn(
        `POSTMARK_TOKEN nicht gesetzt — log-only: to=${msg.to} subj="${msg.subject}"`,
      );
      return { ok: true, messageId: 'log-only' };
    }
    try {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.token,
        },
        body: JSON.stringify({
          From: msg.from ?? this.defaultFrom,
          To: msg.to,
          Subject: msg.subject,
          HtmlBody: msg.html,
          TextBody: msg.text,
          MessageStream: 'outbound',
          Tag: msg.tag,
          ...(msg.attachments && msg.attachments.length > 0
            ? {
                Attachments: msg.attachments.map((a) => ({
                  Name: a.filename,
                  Content: a.content,
                  ContentType: a.contentType,
                })),
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Postmark ${res.status}: ${body}`);
        return { ok: false, error: `postmark_${res.status}` };
      }
      const data = (await res.json()) as { MessageID?: string };
      return { ok: true, messageId: data.MessageID };
    } catch (err) {
      const msgErr = (err as Error).message;
      this.logger.error(`Postmark fetch failed: ${msgErr}`);
      return { ok: false, error: msgErr };
    }
  }
}
