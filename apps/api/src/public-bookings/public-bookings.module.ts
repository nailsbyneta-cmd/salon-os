import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { IdempotencyMiddleware } from '../common/idempotency.middleware.js';
import { PublicBookingsController } from './public-bookings.controller.js';
import { PublicBookingsService } from './public-bookings.service.js';
import { SelfServiceController } from './self-service.controller.js';

@Module({
  controllers: [PublicBookingsController, SelfServiceController],
  providers: [
    PublicBookingsService,
    IdempotencyMiddleware,
    { provide: 'PRISMA_PUBLIC', useValue: prisma },
  ],
})
export class PublicBookingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        { path: 'v1/public/:slug/bookings', method: RequestMethod.POST },
        { path: 'v1/public/:slug/waitlist', method: RequestMethod.POST },
      );
  }
}
