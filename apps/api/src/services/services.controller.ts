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
import {
  createServiceAddOnSchema,
  createServiceBundleSchema,
  createServiceOptionGroupSchema,
  createServiceOptionSchema,
  createServiceSchema,
  updateServiceAddOnSchema,
  updateServiceBundleSchema,
  updateServiceOptionGroupSchema,
  updateServiceOptionSchema,
  updateServiceSchema,
  uuidSchema,
} from '@salon-os/types';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ServicesService } from './services.service.js';
import type {
  Service,
  ServiceAddOn,
  ServiceBundle,
  ServiceCategory,
  ServiceOption,
  ServiceOptionGroup,
} from '@salon-os/db';

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

  // ─── Option-Groups + Options ─────────────────────────────
  @Get('services/:id/option-groups')
  async listOptionGroups(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<{ groups: Array<ServiceOptionGroup & { options: ServiceOption[] }> }> {
    return { groups: await this.svc.listOptionGroups(id) };
  }

  @Post('services/:id/option-groups')
  @HttpCode(HttpStatus.CREATED)
  async createOptionGroup(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(createServiceOptionGroupSchema))
    input: import('@salon-os/types').CreateServiceOptionGroupInput,
  ): Promise<ServiceOptionGroup> {
    return this.svc.createOptionGroup(id, input);
  }

  @Patch('option-groups/:groupId')
  async updateOptionGroup(
    @Param('groupId', new ZodValidationPipe(uuidSchema)) groupId: string,
    @Body(new ZodValidationPipe(updateServiceOptionGroupSchema))
    input: import('@salon-os/types').UpdateServiceOptionGroupInput,
  ): Promise<ServiceOptionGroup> {
    return this.svc.updateOptionGroup(groupId, input);
  }

  @Delete('option-groups/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOptionGroup(
    @Param('groupId', new ZodValidationPipe(uuidSchema)) groupId: string,
  ): Promise<void> {
    await this.svc.deleteOptionGroup(groupId);
  }

  @Post('service-options')
  @HttpCode(HttpStatus.CREATED)
  async createOption(
    @Body(new ZodValidationPipe(createServiceOptionSchema))
    input: import('@salon-os/types').CreateServiceOptionInput,
  ): Promise<ServiceOption> {
    return this.svc.createOption(input);
  }

  @Patch('service-options/:optionId')
  async updateOption(
    @Param('optionId', new ZodValidationPipe(uuidSchema)) optionId: string,
    @Body(new ZodValidationPipe(updateServiceOptionSchema))
    input: import('@salon-os/types').UpdateServiceOptionInput,
  ): Promise<ServiceOption> {
    return this.svc.updateOption(optionId, input);
  }

  @Delete('service-options/:optionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOption(
    @Param('optionId', new ZodValidationPipe(uuidSchema)) optionId: string,
  ): Promise<void> {
    await this.svc.deleteOption(optionId);
  }

  // ─── Add-Ons ─────────────────────────────────────────────
  @Get('services/:id/add-ons')
  async listAddOns(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<{ addOns: ServiceAddOn[] }> {
    return { addOns: await this.svc.listAddOns(id) };
  }

  @Post('services/:id/add-ons')
  @HttpCode(HttpStatus.CREATED)
  async createAddOn(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(createServiceAddOnSchema))
    input: import('@salon-os/types').CreateServiceAddOnInput,
  ): Promise<ServiceAddOn> {
    return this.svc.createAddOn(id, input);
  }

  @Patch('add-ons/:addOnId')
  async updateAddOn(
    @Param('addOnId', new ZodValidationPipe(uuidSchema)) addOnId: string,
    @Body(new ZodValidationPipe(updateServiceAddOnSchema))
    input: import('@salon-os/types').UpdateServiceAddOnInput,
  ): Promise<ServiceAddOn> {
    return this.svc.updateAddOn(addOnId, input);
  }

  @Delete('add-ons/:addOnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddOn(
    @Param('addOnId', new ZodValidationPipe(uuidSchema)) addOnId: string,
  ): Promise<void> {
    await this.svc.deleteAddOn(addOnId);
  }

  // ─── Bundles ─────────────────────────────────────────────
  @Get('services/:id/bundles')
  async listBundles(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<{
    bundles: Array<
      ServiceBundle & {
        bundledService: { id: string; name: string; basePrice: unknown; durationMinutes: number };
      }
    >;
  }> {
    return { bundles: await this.svc.listBundles(id) };
  }

  @Post('services/:id/bundles')
  @HttpCode(HttpStatus.CREATED)
  async createBundle(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(createServiceBundleSchema))
    input: import('@salon-os/types').CreateServiceBundleInput,
  ): Promise<ServiceBundle> {
    return this.svc.createBundle(id, input);
  }

  @Patch('bundles/:bundleId')
  async updateBundle(
    @Param('bundleId', new ZodValidationPipe(uuidSchema)) bundleId: string,
    @Body(new ZodValidationPipe(updateServiceBundleSchema))
    input: import('@salon-os/types').UpdateServiceBundleInput,
  ): Promise<ServiceBundle> {
    return this.svc.updateBundle(bundleId, input);
  }

  @Delete('bundles/:bundleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBundle(
    @Param('bundleId', new ZodValidationPipe(uuidSchema)) bundleId: string,
  ): Promise<void> {
    await this.svc.deleteBundle(bundleId);
  }
}
