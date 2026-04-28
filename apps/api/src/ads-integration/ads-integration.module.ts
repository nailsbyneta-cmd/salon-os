import { Module } from '@nestjs/common';
import { AdsIntegrationCronController } from './ads-integration.controller.js';
import { AdsDashboardController } from './ads-dashboard.controller.js';
import { AdsDashboardService } from './ads-dashboard.service.js';
import { AdsSettingsController } from './ads-settings.controller.js';
import { AdsSettingsService } from './ads-settings.service.js';
import { AdsSpendSyncService } from './ads-spend-sync.service.js';

@Module({
  controllers: [AdsIntegrationCronController, AdsDashboardController, AdsSettingsController],
  providers: [AdsSpendSyncService, AdsDashboardService, AdsSettingsService],
  exports: [AdsSpendSyncService, AdsDashboardService, AdsSettingsService],
})
export class AdsIntegrationModule {}
