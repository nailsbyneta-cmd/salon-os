import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ReviewsService } from './reviews.service.js';

const tokenSchema = z
  .string()
  .min(20)
  .max(500)
  .regex(/^[A-Za-z0-9_\-.]+$/);

const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5).max(2000),
  authorName: z.string().min(1).max(120).optional(),
  featuredOptIn: z.boolean().optional(),
});

/**
 * Public endpoints für Reviews-Automation.
 *  - GET /v1/public/reviews/:token → Context für Submit-Page (Salon-Name, etc.)
 *  - POST /v1/public/reviews/:token/submit → Review schreiben
 *  - POST /v1/public/cron/reviews/enqueue → Cron-Trigger (24h-Sweep)
 */
@Controller('v1/public/reviews')
export class ReviewsPublicController {
  constructor(private readonly svc: ReviewsService) {}

  @Get(':token')
  async resolve(
    @Param('token', new ZodValidationPipe(tokenSchema)) token: string,
  ): Promise<Awaited<ReturnType<ReviewsService['resolveReviewContext']>>> {
    return this.svc.resolveReviewContext(token);
  }

  @Post(':token/submit')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Param('token', new ZodValidationPipe(tokenSchema)) token: string,
    @Body(new ZodValidationPipe(submitSchema)) body: z.infer<typeof submitSchema>,
  ): Promise<Awaited<ReturnType<ReviewsService['submitReview']>>> {
    return this.svc.submitReview(token, body);
  }
}

/**
 * Cron-Endpoint. Trigger via GitHub-Actions täglich 10:00 UTC mit
 * x-cron-secret. Idempotent — bereits enqueued/geschickte werden geskipped.
 */
@Controller('v1/public/cron/reviews')
export class ReviewsCronController {
  constructor(private readonly svc: ReviewsService) {}

  @Post('enqueue')
  @HttpCode(HttpStatus.OK)
  async enqueue(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<{ enqueued: number; tenants: number }> {
    const expected = process.env['CRON_SECRET'];
    if (!expected) {
      throw new BadRequestException('CRON_SECRET not configured.');
    }
    if (secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.svc.enqueueDueReviewRequests();
  }
}
