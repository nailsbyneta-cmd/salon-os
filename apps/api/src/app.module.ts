import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AdsIntegrationModule } from './ads-integration/ads-integration.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AppointmentSeriesModule } from './appointment-series/appointment-series.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BrandingModule } from './branding/branding.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { CustomerAuthModule } from './customer-auth/customer-auth.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { CommonModule } from './common/common.module.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { GiftCardsModule } from './gift-cards/gift-cards.module.js';
import { PromoCodesModule } from './promo-codes/promo-codes.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { LoyaltyModule } from './loyalty/loyalty.module.js';
import { MarketingModule } from './marketing/marketing.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ProductsModule } from './products/products.module.js';
import { PublicBookingsModule } from './public-bookings/public-bookings.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SalonSettingsModule } from './salon-settings/salon-settings.module.js';
import { ServicesModule } from './services/services.module.js';
import { ShiftsModule } from './shifts/shifts.module.js';
import { StaffModule } from './staff/staff.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { VoiceAiModule } from './voice-ai/voice-ai.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { WhatsappModule } from './whatsapp/whatsapp.module.js';
import { FormsModule } from './forms/forms.module.js';

@Module({
  imports: [
    DbModule,
    CommonModule,
    TenantModule,
    AuthModule,
    AuditModule,
    LocationsModule,
    RoomsModule,
    StaffModule,
    ClientsModule,
    CustomerAuthModule,
    ServicesModule,
    AppointmentsModule,
    AppointmentSeriesModule,
    PublicBookingsModule,
    ShiftsModule,
    RemindersModule,
    OutboxModule,
    AdsIntegrationModule,
    ReportsModule,
    ReviewsModule,
    MarketingModule,
    PaymentsModule,
    GiftCardsModule,
    PromoCodesModule,
    LoyaltyModule,
    MembershipsModule,
    WaitlistModule,
    ProductsModule,
    SalonSettingsModule,
    BrandingModule,
    VoiceAiModule,
    WhatsappModule,
    FormsModule,
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
