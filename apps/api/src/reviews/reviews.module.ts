import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { ReviewsCronController, ReviewsPublicController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [CommonModule],
  controllers: [ReviewsPublicController, ReviewsCronController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
