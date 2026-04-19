import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { ServicesModule } from './services/services.module.js';
import { TenantModule } from './tenant/tenant.module.js';

@Module({
  imports: [DbModule, TenantModule, ClientsModule, ServicesModule, AppointmentsModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule {}
