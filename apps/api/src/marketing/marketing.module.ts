import { Module } from '@nestjs/common';
import { MarketingAdminController, MarketingController } from './marketing.controller.js';
import { MarketingService } from './marketing.service.js';

@Module({
  controllers: [MarketingController, MarketingAdminController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
