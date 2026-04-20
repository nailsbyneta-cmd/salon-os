import { Module } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { PublicBookingsController } from './public-bookings.controller.js';
import { PublicBookingsService } from './public-bookings.service.js';
import { SelfServiceController } from './self-service.controller.js';

/**
 * Public-Bookings-Module.
 * PRISMA_PUBLIC ist eine SEPARATE, nicht-RLS-gefilterte Prisma-Instanz für
 * den initialen Tenant-Lookup per Slug — danach wird wieder auf die
 * tenant-scoped Connection via withTenant() gewechselt.
 */
@Module({
  controllers: [PublicBookingsController, SelfServiceController],
  providers: [
    PublicBookingsService,
    { provide: 'PRISMA_PUBLIC', useValue: prisma },
  ],
})
export class PublicBookingsModule {}
