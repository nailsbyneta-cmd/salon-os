import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { SalonFAQ, SalonGalleryImage, SalonReview, Tenant } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SalonSettingsService } from './salon-settings.service.js';

const optionalUrl = z.string().trim().max(500).optional().nullable().or(z.literal(''));

const brandingSchema = z.object({
  tagline: z.string().max(300).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  logoUrl: optionalUrl,
  heroImageUrl: optionalUrl,
  brandColor: z.string().max(30).optional().nullable(),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  whatsappE164: z.string().max(30).optional().nullable(),
  googleBusinessUrl: optionalUrl,
});

const createFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(3000),
  order: z.number().int().optional(),
});
const updateFaqSchema = createFaqSchema.partial().extend({
  active: z.boolean().optional(),
});

const createReviewSchema = z.object({
  authorName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(3000),
  sourceUrl: optionalUrl,
  featured: z.boolean().optional(),
});
const updateReviewSchema = createReviewSchema.partial();

const createGallerySchema = z.object({
  imageUrl: z.string().url().max(500),
  caption: z.string().max(300).optional().nullable(),
  order: z.number().int().optional(),
});
const updateGallerySchema = createGallerySchema.partial();

@Controller('v1/salon')
export class SalonSettingsController {
  constructor(private readonly svc: SalonSettingsService) {}

  @Get('tenant')
  tenant(): Promise<Tenant> {
    return this.svc.getTenant();
  }

  @Patch('branding')
  updateBranding(
    @Body(new ZodValidationPipe(brandingSchema))
    input: z.infer<typeof brandingSchema>,
  ): Promise<Tenant> {
    return this.svc.updateBranding(input);
  }

  // ── FAQ ─────────────────────
  @Get('faqs')
  async listFaqs(): Promise<{ faqs: SalonFAQ[] }> {
    return { faqs: await this.svc.listFaqs() };
  }

  @Post('faqs')
  @HttpCode(HttpStatus.CREATED)
  createFaq(
    @Body(new ZodValidationPipe(createFaqSchema))
    input: z.infer<typeof createFaqSchema>,
  ): Promise<SalonFAQ> {
    return this.svc.createFaq(input);
  }

  @Patch('faqs/:id')
  updateFaq(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateFaqSchema))
    input: z.infer<typeof updateFaqSchema>,
  ): Promise<SalonFAQ> {
    return this.svc.updateFaq(id, input);
  }

  @Delete('faqs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFaq(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.deleteFaq(id);
  }

  // ── Reviews ─────────────────
  @Get('reviews')
  async listReviews(): Promise<{ reviews: SalonReview[] }> {
    return { reviews: await this.svc.listReviews() };
  }

  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  createReview(
    @Body(new ZodValidationPipe(createReviewSchema))
    input: z.infer<typeof createReviewSchema>,
  ): Promise<SalonReview> {
    return this.svc.createReview({
      ...input,
      sourceUrl: input.sourceUrl || null,
    });
  }

  @Patch('reviews/:id')
  updateReview(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateReviewSchema))
    input: z.infer<typeof updateReviewSchema>,
  ): Promise<SalonReview> {
    return this.svc.updateReview(id, {
      ...input,
      ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl || null } : {}),
    });
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.deleteReview(id);
  }

  // ── Gallery ─────────────────
  @Get('gallery')
  async listGallery(): Promise<{ images: SalonGalleryImage[] }> {
    return { images: await this.svc.listGallery() };
  }

  @Post('gallery')
  @HttpCode(HttpStatus.CREATED)
  createGallery(
    @Body(new ZodValidationPipe(createGallerySchema))
    input: z.infer<typeof createGallerySchema>,
  ): Promise<SalonGalleryImage> {
    return this.svc.createGalleryImage(input);
  }

  @Patch('gallery/:id')
  updateGallery(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateGallerySchema))
    input: z.infer<typeof updateGallerySchema>,
  ): Promise<SalonGalleryImage> {
    return this.svc.updateGalleryImage(id, input);
  }

  @Delete('gallery/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGallery(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.deleteGalleryImage(id);
  }
}
