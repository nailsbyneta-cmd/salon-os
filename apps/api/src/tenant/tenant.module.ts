import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware.js';

@Module({
  providers: [TenantMiddleware],
  exports: [TenantMiddleware],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Global angehängt — jeder Route läuft durch die Middleware.
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
