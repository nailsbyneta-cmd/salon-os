import { Module } from '@nestjs/common';
import { prisma } from '@salon-os/db';
import { DbModule } from '../db/db.module.js';
import { AppointmentSeriesController } from './appointment-series.controller.js';
import { AppointmentSeriesService } from './appointment-series.service.js';

@Module({
  imports: [DbModule],
  controllers: [AppointmentSeriesController],
  providers: [AppointmentSeriesService, { provide: 'PRISMA_PUBLIC', useValue: prisma }],
  exports: [AppointmentSeriesService],
})
export class AppointmentSeriesModule {}
