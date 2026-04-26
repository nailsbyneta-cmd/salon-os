import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { z } from 'zod';
import { VoiceAiService } from './voice-ai.service.js';

const incomingCallSchema = z.object({
  CallSid: z.string(),
  From: z.string(),
  To: z.string(),
});

const vapiWebhookSchema = z.object({
  message: z.object({
    type: z.enum(['call-started', 'call-ended', 'transcript']),
    callId: z.string().optional(),
    transcript: z.string().optional(),
    recordingUrl: z.string().url().optional(),
  }),
});

@Controller('v1/voice-ai')
export class VoiceAiController {
  constructor(private readonly voiceAiService: VoiceAiService) {}

  /**
   * POST /v1/voice-ai/incoming-call
   *
   * Twilio Webhook für eingehende Anrufe.
   * Validiert Signature und startet Voice-AI Receptionist.
   *
   * TODO: Implement Twilio signature validation
   * Quelle: https://www.twilio.com/docs/usage/webhooks/webhooks-security
   *
   * Aktuell: Stub, würde Vapi.ai aufrufen.
   *
   * @example
   * POST /v1/voice-ai/incoming-call
   * X-Twilio-Signature: <signature>
   * {
   *   "CallSid": "CA1234567890abcdef",
   *   "From": "+41791003366",
   *   "To": "+41791234567"
   * }
   */
  @Post('incoming-call')
  @HttpCode(200)
  async handleIncomingCall(
    @Body() body: unknown,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<{ status: string; callId: string; message: string }> {
    // Validate Twilio webhook
    if (!signature) {
      console.warn('[VoiceAiController] Missing Twilio signature');
      // TODO: throw UnauthorizedException in production
    }

    const validated = incomingCallSchema.parse(body);
    return this.voiceAiService.handleIncomingCall(validated.From, body as Record<string, unknown>);
  }

  /**
   * POST /v1/voice-ai/vapi-webhook
   *
   * Webhook für Vapi.ai Call-Events.
   * Empfängt Call-Completion, Transcript, Recordings.
   *
   * TODO: Implement Vapi signature validation
   * TODO: Store transcript + recording
   * TODO: Extract booking intent from transcript (LLM-basiert)
   *
   * @example
   * POST /v1/voice-ai/vapi-webhook
   * X-Vapi-Signature: <signature>
   * {
   *   "message": {
   *     "type": "call-ended",
   *     "callId": "call-xyz",
   *     "transcript": "Ich möchte einen Termin für Montag 10 Uhr für Balayage",
   *     "recordingUrl": "https://..."
   *   }
   * }
   */
  @Post('vapi-webhook')
  @HttpCode(200)
  async handleVapiWebhook(
    @Body() payload: unknown,
    @Headers('x-vapi-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      console.warn('[VoiceAiController] Missing Vapi signature');
      // TODO: throw UnauthorizedException in production
    }

    const validated = vapiWebhookSchema.parse(payload);
    return this.voiceAiService.handleVapiWebhook(validated);
  }
}
