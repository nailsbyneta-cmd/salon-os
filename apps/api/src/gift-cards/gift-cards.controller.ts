import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { GiftCard } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { GiftCardsService } from './gift-cards.service.js';

const issueSchema = z.object({
  amount: z.number().positive().max(10_000),
  currency: z.string().length(3).optional(),
  recipientName: z.string().max(120).optional(),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(2000).optional(),
  expiresInDays: z.number().int().min(1).max(730).optional(),
});

const redeemSchema = z.object({
  code: z.string().min(1).max(32),
  amount: z.number().positive(),
});

@Controller('v1/gift-cards')
export class GiftCardsController {
  constructor(private readonly svc: GiftCardsService) {}

  @Get()
  async list(): Promise<{ giftCards: GiftCard[] }> {
    return { giftCards: await this.svc.list() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async issue(
    @Body(new ZodValidationPipe(issueSchema)) input: z.infer<typeof issueSchema>,
  ): Promise<GiftCard> {
    return this.svc.issue(input);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  async redeem(
    @Body(new ZodValidationPipe(redeemSchema)) input: z.infer<typeof redeemSchema>,
  ): Promise<GiftCard> {
    return this.svc.redeem(input.code, input.amount);
  }
}

@Controller('v1/public/gift-cards')
export class PublicGiftCardsController {
  constructor(private readonly svc: GiftCardsService) {}

  @Get(':code')
  async verify(@Param('code') code: string): Promise<{
    code: string;
    balance: string;
    currency: string;
    recipientName: string | null;
    message: string | null;
    expiresAt: Date | null;
    tenantName: string;
  }> {
    const card = await this.svc.verify(code);
    if (!card) throw new NotFoundException('Gutschein nicht gefunden oder abgelaufen.');
    return card;
  }
}
