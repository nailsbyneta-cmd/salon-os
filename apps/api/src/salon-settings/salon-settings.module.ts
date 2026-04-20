import { Module } from '@nestjs/common';
import { SalonSettingsController } from './salon-settings.controller.js';
import { SalonSettingsService } from './salon-settings.service.js';

@Module({
  controllers: [SalonSettingsController],
  providers: [SalonSettingsService],
  exports: [SalonSettingsService],
})
export class SalonSettingsModule {}
