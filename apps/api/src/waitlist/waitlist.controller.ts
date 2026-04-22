import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { WaitlistEntry } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { WaitlistService } from './waitlist.service.js';

const publicAddSchema = z.object({
  serviceId: uuidSchema,
  locationId: uuidSchema,
  preferredStaffId: uuidSchema.optional().nullable(),
  earliestAt: z.string().datetime({ offset: true }),
  latestAt: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).optional(),
  client: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
  }),
});

const adminAddSchema = z.object({
  serviceId: uuidSchema,
  locationId: uuidSchema,
  preferredStaffId: uuidSchema.optional().nullable(),
  earliestAt: z.string().datetime({ offset: true }),
  latestAt: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).optional(),
  clientId: uuidSchema.optional(),
  newClient: z
    .object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().max(30).optional(),
    })
    .optional(),
});

const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

@Controller('v1/waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Get()
  async list(): Promise<{ entries: WaitlistEntry[] }> {
    return { entries: await this.svc.listActive() };
  }

  @Get('matches')
  async matches(
    @Query('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('preferredStaffId') preferredStaffId?: string,
  ): Promise<{ entries: WaitlistEntry[] }> {
    if (!from || !to) return { entries: [] };
    const entries = await this.svc.findMatches({
      serviceId,
      fromIso: from,
      toIso: to,
      preferredStaffId: preferredStaffId?.trim() || undefined,
    });
    return { entries };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Body(new ZodValidationPipe(adminAddSchema))
    body: z.infer<typeof adminAddSchema>,
  ): Promise<WaitlistEntry> {
    return this.svc.adminAdd({
      ...body,
      newClient: body.newClient
        ? {
            ...body.newClient,
            email: body.newClient.email || undefined,
          }
        : undefined,
    });
  }

  @Post(':id/fulfill')
  @HttpCode(HttpStatus.OK)
  async fulfill(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<WaitlistEntry> {
    return this.svc.setStatus(id, 'FULFILLED');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<WaitlistEntry> {
    return this.svc.setStatus(id, 'CANCELLED');
  }
}

@Controller('v1/public/:tenantSlug/waitlist')
export class PublicWaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('tenantSlug', new ZodValidationPipe(slugSchema)) slug: string,
    @Body(new ZodValidationPipe(publicAddSchema))
    body: z.infer<typeof publicAddSchema>,
  ): Promise<WaitlistEntry> {
    return this.svc.publicAdd(slug, body);
  }
}
