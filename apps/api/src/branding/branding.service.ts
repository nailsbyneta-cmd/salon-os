import { Injectable, NotFoundException } from '@nestjs/common';
import { BrandingDto } from './branding.dto.js';

// TODO: Wenn Prisma TenantBranding-Model existiert: @Inject(PRISMA) wie in appointments.service.ts
// Aktuell pure Stub-Implementation ohne DB-Abhängigkeit damit App startet.

/**
 * Service für White-Label Branding.
 * Verwaltung von Salon-spezifischen Branding-Assets und Design-Einstellungen.
 *
 * TODO: Noch nicht mit DB verbunden. Momentan Return von Hardcoded Demo-Daten.
 * Integration mit Prisma Schema nötig nach Migration:
 *   model TenantBranding {
 *     id String @id @default(cuid())
 *     tenantId String @unique
 *     logoUrl String
 *     primaryColor String
 *     secondaryColor String
 *     fontFamily String
 *     appName String
 *     splashScreenUrl String?
 *     deepLinkScheme String
 *     createdAt DateTime @default(now())
 *     updatedAt DateTime @updatedAt
 *   }
 */
@Injectable()
export class BrandingService {
  // TODO: constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Holt Branding-Daten für einen Tenant via slug.
   * TODO: Implementierung mit Prisma sobald Schema Migration aktiv.
   */
  async getBrandingByTenantSlug(tenantSlug: string): Promise<BrandingDto> {
    // TODO: Implement Prisma query
    // const branding = await this.prisma.tenantBranding.findUnique({
    //   where: { tenant: { slug: tenantSlug } },
    // });
    // if (!branding) throw new NotFoundException(`Branding für ${tenantSlug} nicht gefunden`);
    // return this.mapToBrandingDto(branding);

    // Demo-Daten für Beautycenter by Neta (Stub)
    if (tenantSlug === 'beautycenter-by-neta') {
      return {
        tenantSlug,
        logoUrl: 'https://cdn.example.com/beautycenter-by-neta/logo.svg',
        primaryColor: '#0A0A0A', // Dark
        secondaryColor: '#FAF8F5', // Cream
        accentColor: '#C8A96E', // Gold
        fontFamily: "'Playfair Display', Georgia, serif",
        appName: 'Beauty Center Neta',
        splashScreenUrl: 'https://cdn.example.com/beautycenter-by-neta/splash.png',
        deepLinkScheme: 'beautycenter-neta://',
      };
    }

    throw new NotFoundException(`Branding für ${tenantSlug} nicht gefunden`);
  }

  /**
   * Erstellt oder aktualisiert Branding für einen Tenant.
   * TODO: Implementierung mit Prisma sobald Schema Migration aktiv.
   */
  async upsertBranding(tenantSlug: string, dto: Partial<BrandingDto>): Promise<BrandingDto> {
    // TODO: Implement Prisma upsert
    // const branding = await this.prisma.tenantBranding.upsert({
    //   where: { tenant: { slug: tenantSlug } },
    //   update: { ...dto },
    //   create: {
    //     tenant: { connect: { slug: tenantSlug } },
    //     ...dto,
    //   },
    // });
    // return this.mapToBrandingDto(branding);

    console.warn('[BrandingService] Stub: upsertBranding would save to DB');
    return { tenantSlug, ...dto } as BrandingDto;
  }

  // TODO: Private helper Methods
  // private mapToBrandingDto(raw: any): BrandingDto { ... }
}
