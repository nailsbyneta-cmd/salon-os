import { Module } from '@nestjs/common';
import { AdsIntegrationCronController } from './ads-integration.controller.js';
import { AdsDashboardController } from './ads-dashboard.controller.js';
import { AdsDashboardService } from './ads-dashboard.service.js';
import { AdsSpendSyncService } from './ads-spend-sync.service.js';

@Module({
  controllers: [AdsIntegrationCronController, AdsDashboardController],
  providers: [AdsSpendSyncService, AdsDashboardService],
  exports: [AdsSpendSyncService, AdsDashboardService],
})
export class AdsIntegrationModule {}
