import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createServiceSchema, updateServiceSchema, uuidSchema } from '@salon-os/types';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ServicesService } from './services.service.js';
import type { Service, ServiceCategory } from '@salon-os/db';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().default(0),
});

@Controller('v1')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  // ─── Categories ──────────────────────────────────────────
  @Get('service-categories')
  async listCategories(): Promise<{ categories: ServiceCategory[] }> {
    return { categories: await this.svc.listCategories() };
  }

  @Post('service-categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body(new ZodValidationPipe(createCategorySchema))
    body: z.infer<typeof createCategorySchema>,
  ): Promise<ServiceCategory> {
    return this.svc.createCategory(body.name, body.order);
  }

  // ─── Services ────────────────────────────────────────────
  @Get('services')
  async list(
    @Query('bookable') bookable?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<{ services: Service[] }> {
    const services = await this.svc.list({
      bookable: bookable === undefined ? undefined : bookable === 'true',
      categoryId,
    });
    return { services };
  }

  @Get('services/:id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Service> {
    return this.svc.get(id);
  }

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createServiceSchema))
    input: import('@salon-os/types').CreateServiceInput,
  ): Promise<Service> {
    return this.svc.create(input);
  }

  @Patch('services/:id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateServiceSchema))
    input: import('@salon-os/types').UpdateServiceInput,
  ): Promise<Service> {
    return this.svc.update(id, input);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.softDelete(id);
  }
}
