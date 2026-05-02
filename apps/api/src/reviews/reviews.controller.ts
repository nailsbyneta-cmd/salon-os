import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import type { SalonReview } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { requireTenantContext } from '../tenant/tenant.context.js';
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

// ── Admin Schemas ──────────────────────────────────────────────────────────

const uuidParamSchema = z
  .string()
  .uuid('Ungültige UUID');

const featureBodySchema = z.object({
  featured: z.boolean(),
});

const importBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(3000),
  authorName: z.string().min(1).max(120),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  source: z.enum(['manual', 'google_import']).optional().nullable(),
});

const listQuerySchema = z.object({
  rating: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(5).optional()),
  featured: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  source: z.enum(['auto_email', 'manual', 'google_import']).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, Number.parseInt(v, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, Math.max(1, Number.parseInt(v, 10))) : 20)),
});

/**
 * Admin endpoints for review management.
 * Requires OWNER or MANAGER role (enforced in service layer).
 */
@Controller('v1/reviews')
export class ReviewsAdminController {
  constructor(private readonly svc: ReviewsService) {}

  /**
   * GET /v1/reviews
   * List reviews with optional filters + aggregate stats.
   */
  @Get()
  async list(
    @Query() rawQuery: Record<string, string>,
  ): Promise<
    Awaited<ReturnType<ReviewsService['listReviews']>>
  > {
    const ctx = requireTenantContext();
    const query = listQuerySchema.parse(rawQuery);
    return this.svc.listReviews(ctx.tenantId, {
      rating: query.rating,
      featured: query.featured,
      source: query.source,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  /**
   * PATCH /v1/reviews/:id/feature
   * Toggle featured flag. OWNER or MANAGER.
   */
  @Patch(':id/feature')
  async feature(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(featureBodySchema)) body: z.infer<typeof featureBodySchema>,
  ): Promise<SalonReview> {
    const ctx = requireTenantContext();
    return this.svc.toggleFeature(ctx.tenantId, id, body.featured);
  }

  /**
   * DELETE /v1/reviews/:id
   * Delete a review. OWNER only.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ): Promise<void> {
    const ctx = requireTenantContext();
    await this.svc.deleteReview(ctx.tenantId, id);
  }

  /**
   * POST /v1/reviews/import
   * Manually import a review (submittedVia: 'manual'). OWNER or MANAGER.
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importReview(
    @Body(new ZodValidationPipe(importBodySchema)) body: z.infer<typeof importBodySchema>,
  ): Promise<SalonReview> {
    const ctx = requireTenantContext();
    return this.svc.importReview(ctx.tenantId, body);
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
