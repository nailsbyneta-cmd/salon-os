import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { DbModule } from './db/db.module.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { HealthController } from './health/health.controller.js';
import { GiftCardsModule } from './gift-cards/gift-cards.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ProductsModule } from './products/products.module.js';
import { PublicBookingsModule } from './public-bookings/public-bookings.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SalonSettingsModule } from './salon-settings/salon-settings.module.js';
import { ServicesModule } from './services/services.module.js';
import { ShiftsModule } from './shifts/shifts.module.js';
import { StaffModule } from './staff/staff.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';

@Module({
  imports: [
    DbModule,
    IdempotencyModule,
    OutboxModule,
    TenantModule,
    AuthModule,
    AuditModule,
    LocationsModule,
    RoomsModule,
    StaffModule,
    ClientsModule,
    ServicesModule,
    AppointmentsModule,
    PublicBookingsModule,
    ShiftsModule,
    RemindersModule,
    PaymentsModule,
    GiftCardsModule,
    WaitlistModule,
    ProductsModule,
    SalonSettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule {}
