import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common';
import { z } from 'zod';
import { WhatsappService } from './whatsapp.service.js';

const webhookMessageSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.literal('whatsapp'),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  text: z.object({ body: z.string() }),
                  type: z.literal('text'),
                }),
              )
              .optional(),
          }),
          field: z.string(),
        }),
      ),
    }),
  ),
});

const sendConfirmationSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, 'Valid E.164 phone required'),
  serviceId: z.string(),
  serviceName: z.string(),
  startTime: z.string().datetime(),
  location: z.string(),
  confirmationCode: z.string(),
});

@Controller('v1/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * GET /v1/whatsapp/webhook
   *
   * Webhook Verification für Meta WhatsApp Cloud API.
   *
   * Meta sendet einen GET Request zur Verifikation. Salon-OS muss
   * den VERIFY_TOKEN zurückgeben um das Webhook zu aktivieren.
   *
   * Setup in Meta Dashboard:
   * 1. App → WhatsApp → Configuration → Webhook URL setzen
   * 2. Verify Token selbst definieren + in Env-Var speichern
   * 3. Subscribe to: messages
   *
   * @example
   * GET /v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my-secret&hub.challenge=xyz
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | { status: string } {
    const verifyToken = process.env['WHATSAPP_VERIFY_TOKEN'];

    if (mode !== 'subscribe') {
      return { status: 'Invalid mode' };
    }

    if (token !== verifyToken) {
      console.warn('[WhatsappController] Invalid verify token');
      return { status: 'Forbidden' };
    }

    // Meta expects the challenge to be returned as plain text
    return challenge;
  }

  /**
   * POST /v1/whatsapp/webhook
   *
   * Empfängt eingehende WhatsApp Nachrichten von Meta Cloud API.
   *
   * Flow:
   * 1. Parse Webhook Payload
   * 2. Extract message + sender
   * 3. Parse booking intent (LLM-based)
   * 4. Create booking if valid
   * 5. Send confirmation via WhatsApp template
   * 6. Log interaction for audit
   *
   * TODO: Implement idempotency (message.id dedup)
   * TODO: Implement error recovery + async processing
   *
   * @example
   * POST /v1/whatsapp/webhook
   * {
   *   "object": "whatsapp_business_account",
   *   "entry": [{
   *     "changes": [{
   *       "value": {
   *         "messages": [{
   *           "from": "+41791003366",
   *           "id": "wamsg_xyz",
   *           "text": { "body": "Ich möchte Montag Balayage" }
   *         }]
   *       }
   *     }]
   *   }]
   * }
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() payload: unknown): Promise<{ status: string }> {
    try {
      const validated = webhookMessageSchema.parse(payload);

      // Extract first message (simplistic — real implementation needs proper message handling)
      const changes = validated.entry[0]?.changes[0];
      const messages = changes?.value.messages;
      if (!messages || messages.length === 0) {
        return { status: 'no_messages' };
      }

      const message = messages[0];
      if (!message) {
        return { status: 'no_messages' };
      }
      const senderPhone = message.from;
      const messageText = message.text.body;

      // Parse booking intent from message
      const intent = this.whatsappService.parseBookingIntent(messageText, senderPhone);

      if (!intent || intent.type !== 'booking') {
        // Handle general enquiry
        const answer = await this.whatsappService.answerEnquiry(messageText, 'TODO-tenantId');
        // TODO: Send answer via WhatsApp
        console.log(`[WhatsappController] Enquiry answer: ${answer}`);
        return { status: 'enquiry_answered' };
      }

      // TODO: Implement booking creation
      // TODO: Validate service exists
      // TODO: Find available slots
      // TODO: Create appointment
      // TODO: Send confirmation

      console.log('[WhatsappController] Booking intent parsed:', intent);

      return { status: 'booking_processed' };
    } catch (err) {
      console.error('[WhatsappController] Webhook error:', err);
      // Always return 200 to acknowledge to Meta, even on error
      return { status: 'error' };
    }
  }

  /**
   * POST /v1/whatsapp/send-confirmation
   *
   * Sendet Buchungs-Bestätigung via WhatsApp Template.
   *
   * TODO: Auth erforderlich (Tenant-Owner oder System)
   *
   * Benutzt Meta WhatsApp Message Templates (pre-approved für Compliance).
   *
   * @example
   * POST /v1/whatsapp/send-confirmation
   * {
   *   "phone": "+41791003366",
   *   "serviceId": "service_xyz",
   *   "serviceName": "Balayage",
   *   "startTime": "2026-05-12T10:00:00Z",
   *   "location": "Kräzernstrasse 79, 9015 St. Gallen",
   *   "confirmationCode": "BOOK-123456"
   * }
   */
  @Post('send-confirmation')
  @HttpCode(200)
  async sendConfirmation(@Body() dto: unknown): Promise<{ messageId: string; status: string }> {
    try {
      const validated = sendConfirmationSchema.parse(dto);
      // TODO: Add @UseGuards(AuthGuard)
      return this.whatsappService.sendBookingConfirmation(validated.phone, {
        serviceId: validated.serviceId,
        serviceName: validated.serviceName,
        startTime: new Date(validated.startTime),
        location: validated.location,
        confirmationCode: validated.confirmationCode,
      });
    } catch (err) {
      console.error('[WhatsappController] send-confirmation error:', err);
      throw err;
    }
  }
}
