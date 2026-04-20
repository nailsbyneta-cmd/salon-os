import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { Product } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(60).optional(),
  brand: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  barcode: z.string().max(60).optional(),
  type: z.enum(['RETAIL', 'BACKBAR', 'BOTH']).default('RETAIL'),
  unit: z.string().max(30).optional(),
  costCents: z.number().int().min(0).default(0),
  retailCents: z.number().int().min(0).default(0),
  stockLevel: z.number().int().min(0).default(0),
  reorderAt: z.number().int().min(0).default(0),
  reorderQty: z.number().int().min(0).default(0),
  supplier: z.string().max(120).optional(),
});

const adjustSchema = z.object({
  delta: z.number().int(),
});

@Controller('v1/products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  async list(@Query('lowStock') lowStock?: string): Promise<{ products: Product[] }> {
    return { products: await this.svc.list({ lowStockOnly: lowStock === 'true' }) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createSchema)) input: z.infer<typeof createSchema>,
  ): Promise<Product> {
    return this.svc.create(input);
  }

  @Post(':id/adjust')
  @HttpCode(HttpStatus.OK)
  async adjust(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(adjustSchema)) body: z.infer<typeof adjustSchema>,
  ): Promise<Product> {
    return this.svc.adjustStock(id, body.delta);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.softDelete(id);
  }
}
