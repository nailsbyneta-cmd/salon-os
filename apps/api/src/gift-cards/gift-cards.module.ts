import { Module } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { DbModule } from '../db/db.module.js';
import {
  GiftCardsController,
  PublicGiftCardsController,
} from './gift-cards.controller.js';
import { GiftCardsService } from './gift-cards.service.js';

@Module({
  imports: [DbModule],
  controllers: [GiftCardsController, PublicGiftCardsController],
  providers: [
    GiftCardsService,
    { provide: 'PRISMA_PUBLIC', useValue: prisma },
  ],
})
export class GiftCardsModule {}
