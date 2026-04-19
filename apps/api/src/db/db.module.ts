import { Global, Module } from '@nestjs/common';
import { prisma, withTenant } from '@salon-os/db';

/**
 * DB-Modul stellt den Prisma-Client + tenant-scoped Helper bereit.
 */
export const PRISMA = Symbol('PRISMA');
export const WITH_TENANT = Symbol('WITH_TENANT');

@Global()
@Module({
  providers: [
    { provide: PRISMA, useValue: prisma },
    { provide: WITH_TENANT, useValue: withTenant },
  ],
  exports: [PRISMA, WITH_TENANT],
})
export class DbModule {}
