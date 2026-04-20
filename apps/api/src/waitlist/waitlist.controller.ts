import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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

const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

@Controller('v1/waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Get()
  async list(): Promise<{ entries: WaitlistEntry[] }> {
    return { entries: await this.svc.listActive() };
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
