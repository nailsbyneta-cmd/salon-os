import { Module } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { DbModule } from '../db/db.module.js';
import {
  PublicWaitlistController,
  WaitlistController,
} from './waitlist.controller.js';
import { WaitlistService } from './waitlist.service.js';

@Module({
  imports: [DbModule],
  controllers: [WaitlistController, PublicWaitlistController],
  providers: [
    WaitlistService,
    { provide: 'PRISMA_PUBLIC', useValue: prisma },
  ],
})
export class WaitlistModule {}
