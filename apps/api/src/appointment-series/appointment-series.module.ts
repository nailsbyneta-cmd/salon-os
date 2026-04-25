import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module.js';
import { AppointmentSeriesController } from './appointment-series.controller.js';
import { AppointmentSeriesService } from './appointment-series.service.js';

@Module({
  imports: [DbModule],
  controllers: [AppointmentSeriesController],
  providers: [AppointmentSeriesService],
  exports: [AppointmentSeriesService],
})
export class AppointmentSeriesModule {}
