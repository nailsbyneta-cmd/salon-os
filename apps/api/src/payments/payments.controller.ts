import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PRISMA } from '../db/db.module.js';
import { PaymentsService } from './payments.service.js';

const createCheckoutSchema = z.object({
  appointmentId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  description: z.string().max(200).default('Anzahlung Termin'),
  customerEmail: z.string().email().optional(),
});

@Controller('v1/payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body(new ZodValidationPipe(createCheckoutSchema))
    input: z.infer<typeof createCheckoutSchema>,
  ): Promise<{ url: string; sessionId: string; dryRun: boolean }> {
    const result = await this.svc.createDepositCheckout(input);
    return { ...result, dryRun: !this.svc.isConfigured() };
  }

  /**
   * Stripe Webhook-Endpoint. Fastify-raw-Body brauchen wir NICHT, weil
   * `stripe.webhooks.constructEvent` den Raw-Body + Signature selber
   * prüft. Wir müssen den JSON-Body als String reinreichen.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: FastifyRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = (req as unknown as { rawBody?: string | Buffer }).rawBody;
    if (!raw) {
      throw new BadRequestException(
        'Raw body missing — konfiguriere Fastify mit rawBody=true',
      );
    }
    const event = this.svc.constructEvent(raw, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: { appointmentId?: string };
        amount_total?: number;
      };
      const appointmentId = session.metadata?.appointmentId;
      if (appointmentId) {
        // Tenant-bypass: Webhook kommt ohne Session-Context, wir trauen
        // der Stripe-Signatur.
        await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            depositPaid: true,
            depositPaidAt: new Date(),
            depositAmount: session.amount_total
              ? session.amount_total / 100
              : undefined,
          },
        });
      }
    }

    return { received: true };
  }
}
