import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [DbModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
