import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { z } from 'zod';
import { BrandingService } from './branding.service.js';
import { BrandingDto, brandingDtoSchema } from './branding.dto.js';

const tenantSlugSchema = z.string().min(1).max(120);

@Controller('v1/branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  /**
   * GET /v1/branding/:tenantSlug
   *
   * Holt Branding-Konfiguration für eine Salon.
   * Öffentlich erreichbar (für Client-Apps & Websites).
   *
   * @param tenantSlug Salon-Slug (z.B. "beautycenter-by-neta")
   * @returns BrandingDto mit Logo, Farben, Fonts, etc.
   *
   * @example
   * GET /v1/branding/beautycenter-by-neta
   * =>
   * {
   *   "tenantSlug": "beautycenter-by-neta",
   *   "logoUrl": "https://...",
   *   "primaryColor": "#0A0A0A",
   *   "secondaryColor": "#FAF8F5",
   *   "accentColor": "#C8A96E",
   *   "fontFamily": "'Playfair Display', Georgia, serif",
   *   "appName": "Beauty Center Neta",
   *   "deepLinkScheme": "beautycenter-neta://"
   * }
   */
  @Get(':tenantSlug')
  async getBranding(@Param('tenantSlug') tenantSlug: string): Promise<BrandingDto> {
    const validated = tenantSlugSchema.parse(tenantSlug);
    return this.brandingService.getBrandingByTenantSlug(validated);
  }

  /**
   * POST /v1/branding/:tenantSlug
   *
   * Erstellt oder aktualisiert Branding-Konfiguration.
   * Benötigt Tenant-Admin-Authentifizierung.
   *
   * TODO: Auth-Guard hinzufügen (IsAuthenticated + TenantOwner)
   *
   * @param tenantSlug Salon-Slug
   * @param dto Partial-Updates zu BrandingDto
   * @returns Aktualisierte BrandingDto
   *
   * @example
   * POST /v1/branding/beautycenter-by-neta
   * {
   *   "logoUrl": "https://new-logo.png",
   *   "primaryColor": "#1a1a1a"
   * }
   */
  @Post(':tenantSlug')
  @HttpCode(200)
  async upsertBranding(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: Partial<BrandingDto>,
  ): Promise<BrandingDto> {
    const validated = tenantSlugSchema.parse(tenantSlug);
    const dtoValidated = brandingDtoSchema.partial().parse(dto);
    // TODO: ADD AUTH GUARD
    // @UseGuards(AuthGuard, TenantOwnerGuard)
    return this.brandingService.upsertBranding(validated, dtoValidated);
  }
}
