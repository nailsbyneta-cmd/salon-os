import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

export interface CheckoutInput {
  appointmentId: string;
  amount: number; // CHF, e.g. 25 = 25.00 CHF
  currency: string; // "CHF", "EUR"
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;

  constructor() {
    const key = process.env['STRIPE_SECRET_KEY'];
    this.webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!key) {
      this.logger.warn(
        'STRIPE_SECRET_KEY nicht gesetzt — Payments laufen im Dry-Run.',
      );
      this.stripe = null;
    } else {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Legt eine Stripe-Checkout-Session für eine Anzahlung an.
   * Ohne STRIPE_SECRET_KEY → Dry-Run, gibt eine Pseudo-URL zurück.
   */
  async createDepositCheckout(input: CheckoutInput): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      const fakeId = `cs_dryrun_${Date.now()}`;
      this.logger.log(
        `[dry-run] Checkout Session für appt=${input.appointmentId} amount=${input.amount} ${input.currency}`,
      );
      return {
        sessionId: fakeId,
        url: `${input.successUrl}?session=${fakeId}&dryrun=1`,
      };
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: Math.round(input.amount * 100),
            product_data: { name: input.description },
          },
        },
      ],
      customer_email: input.customerEmail,
      client_reference_id: input.appointmentId,
      metadata: { appointmentId: input.appointmentId },
      success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) {
      throw new Error('Stripe returned a session without a URL');
    }
    return { sessionId: session.id, url: session.url };
  }

  /**
   * Verifiziert + dekodiert ein Stripe-Webhook-Event.
   * Ohne STRIPE_WEBHOOK_SECRET → throw, damit nichts ohne Signatur durchkommt.
   */
  constructEvent(payload: string | Buffer, signature: string | undefined): Stripe.Event {
    if (!this.stripe || !this.webhookSecret) {
      throw new NotFoundException('Stripe webhook not configured');
    }
    if (!signature) {
      throw new NotFoundException('Missing Stripe signature');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
