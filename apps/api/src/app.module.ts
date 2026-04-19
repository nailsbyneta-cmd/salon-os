import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ClientsModule } from './clients/clients.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { TenantModule } from './tenant/tenant.module.js';

@Module({
  imports: [DbModule, TenantModule, ClientsModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule {}
