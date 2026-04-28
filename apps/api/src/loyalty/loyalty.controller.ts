import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { LoyaltyProgram, LoyaltyStamp } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { LoyaltyService } from './loyalty.service.js';

const programSchema = z.object({
  name: z.string().min(1).max(120),
  active: z.boolean().optional(),
  earnRule: z.enum(['per_appointment', 'per_chf']).optional(),
  earnPerUnit: z.number().int().min(1).max(1000).optional(),
  redeemThreshold: z.number().int().min(1).max(100).optional(),
  rewardValueChf: z.number().min(0).max(10000).optional(),
  rewardLabel: z.string().min(1).max(120).optional(),
});

const awardSchema = z.object({
  delta: z.number().int().min(1).max(100),
  appointmentId: uuidSchema.optional(),
  notes: z.string().max(500).optional(),
});

const adjustSchema = z.object({
  delta: z.number().int().min(-100).max(100),
  notes: z.string().max(500).optional(),
});

const redeemSchema = z.object({
  notes: z.string().max(500).optional(),
});

@Controller('v1/loyalty')
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  @Get('program')
  async getProgram(): Promise<{ program: LoyaltyProgram | null }> {
    return { program: await this.svc.getProgram() };
  }

  @Put('program')
  @HttpCode(HttpStatus.OK)
  async upsertProgram(
    @Body(new ZodValidationPipe(programSchema)) body: z.infer<typeof programSchema>,
  ): Promise<LoyaltyProgram> {
    return this.svc.upsertProgram(body);
  }

  @Get('clients/:clientId')
  async getBalance(
    @Param('clientId', new ZodValidationPipe(uuidSchema)) clientId: string,
  ): Promise<Awaited<ReturnType<LoyaltyService['getClientBalance']>>> {
    return this.svc.getClientBalance(clientId);
  }

  @Get('clients/:clientId/stamps')
  async listStamps(
    @Param('clientId', new ZodValidationPipe(uuidSchema)) clientId: string,
    @Query('limit') limit?: string,
  ): Promise<{ stamps: LoyaltyStamp[] }> {
    const n = limit ? Math.max(1, Math.min(200, Number(limit))) : 50;
    return { stamps: await this.svc.listClientStamps(clientId, n) };
  }

  @Post('clients/:clientId/award')
  @HttpCode(HttpStatus.OK)
  async award(
    @Param('clientId', new ZodValidationPipe(uuidSchema)) clientId: string,
    @Body(new ZodValidationPipe(awardSchema)) body: z.infer<typeof awardSchema>,
  ): Promise<LoyaltyStamp> {
    return this.svc.awardStamps({ clientId, ...body });
  }

  @Post('clients/:clientId/redeem')
  @HttpCode(HttpStatus.OK)
  async redeem(
    @Param('clientId', new ZodValidationPipe(uuidSchema)) clientId: string,
    @Body(new ZodValidationPipe(redeemSchema)) body: z.infer<typeof redeemSchema>,
  ): Promise<Awaited<ReturnType<LoyaltyService['redeemReward']>>> {
    return this.svc.redeemReward({ clientId, ...body });
  }

  @Post('clients/:clientId/adjust')
  @HttpCode(HttpStatus.OK)
  async adjust(
    @Param('clientId', new ZodValidationPipe(uuidSchema)) clientId: string,
    @Body(new ZodValidationPipe(adjustSchema)) body: z.infer<typeof adjustSchema>,
  ): Promise<LoyaltyStamp> {
    if (body.delta === 0) throw new NotFoundException('delta = 0 ist keine Anpassung');
    return this.svc.adjustStamps({ clientId, ...body });
  }
}
