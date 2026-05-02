import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module.js';
import { PromoCodesController } from './promo-codes.controller.js';
import { PromoCodesService } from './promo-codes.service.js';

@Module({
  imports: [DbModule],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
