import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { MembershipsService } from './memberships.service.js';
import type {
  ClientMembershipWithPlan,
  CreatePlanInput,
  UpdatePlanInput,
} from './memberships.service.js';
import type { ClientMembership, MembershipPlan } from '@salon-os/db';

const billingCycleEnum = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']);

const createPlanSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  priceChf: z.number().min(0).max(100_000),
  billingCycle: billingCycleEnum,
  sessionCredits: z.number().int().min(1).max(9_999).nullable().optional(),
  discountPct: z.number().int().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  priceChf: z.number().min(0).max(100_000).optional(),
  billingCycle: billingCycleEnum.optional(),
  sessionCredits: z.number().int().min(1).max(9_999).nullable().optional(),
  discountPct: z.number().int().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
});

const subscribeSchema = z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
});

@Controller('v1/memberships')
export class MembershipsController {
  constructor(private readonly svc: MembershipsService) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  @Get('plans')
  async listPlans(): Promise<{ plans: MembershipPlan[] }> {
    return { plans: await this.svc.listPlans() };
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body(new ZodValidationPipe(createPlanSchema)) body: CreatePlanInput,
  ): Promise<MembershipPlan> {
    return this.svc.createPlan(body);
  }

  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanInput,
  ): Promise<MembershipPlan> {
    return this.svc.updatePlan(id, body);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.OK)
  async deactivatePlan(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipPlan> {
    return this.svc.deactivatePlan(id);
  }

  // ─── Client Memberships ────────────────────────────────────────────────────

  @Get('active')
  async listActiveMemberships(): Promise<{
    memberships: Awaited<ReturnType<MembershipsService['listActiveMemberships']>>;
  }> {
    return { memberships: await this.svc.listActiveMemberships() };
  }

  @Get('clients/:clientId')
  async getClientMembership(
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<{ membership: ClientMembershipWithPlan | null }> {
    return { membership: await this.svc.getClientMembership(clientId) };
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Body(new ZodValidationPipe(subscribeSchema)) body: z.infer<typeof subscribeSchema>,
  ): Promise<ClientMembershipWithPlan> {
    return this.svc.subscribe(body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<ClientMembership> {
    return this.svc.cancel(id);
  }

  @Post(':id/use-credit')
  @HttpCode(HttpStatus.OK)
  async useCredit(@Param('id', ParseUUIDPipe) id: string): Promise<ClientMembership> {
    return this.svc.useCredit(id);
  }
}
