import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { type PublicProduct, StoreService } from './store.service.js';

const slugParamSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

@Controller('v1/store')
export class StoreController {
  constructor(private readonly svc: StoreService) {}

  @Get(':slug/products')
  async listProducts(
    @Param('slug', new ZodValidationPipe(slugParamSchema)) slug: string,
  ): Promise<{ products: PublicProduct[] }> {
    return { products: await this.svc.listProducts(slug) };
  }
}
