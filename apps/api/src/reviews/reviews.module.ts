import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import {
  ReviewsAdminController,
  ReviewsCronController,
  ReviewsPublicController,
} from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [CommonModule],
  controllers: [ReviewsPublicController, ReviewsCronController, ReviewsAdminController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
