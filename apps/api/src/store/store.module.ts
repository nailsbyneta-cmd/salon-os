import { Module } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { DbModule } from '../db/db.module.js';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';

@Module({
  imports: [DbModule],
  controllers: [StoreController],
  providers: [{ provide: 'PRISMA_PUBLIC', useValue: prisma }, StoreService],
})
export class StoreModule {}
