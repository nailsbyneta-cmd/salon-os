import { z } from 'zod';

/**
 * DTO für White-Label Branding Konfiguration.
 * Wird von Client-Apps (iOS/Android/Web) genutzt um sich selbst zu "färben".
 */
export const brandingDtoSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  logoUrl: z.string().url(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Hex-Farbe erforderlich'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Hex-Farbe erforderlich'),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Hex-Farbe erforderlich'),
  fontFamily: z.string(),
  appName: z.string().min(1).max(100),
  splashScreenUrl: z.string().url().optional(),
  deepLinkScheme: z.string().min(1).max(50),
});

export type BrandingDto = z.infer<typeof brandingDtoSchema>;

/**
 * Prisma Migration (auskommentiert bis Schema-Änderung aktiv):
 *
 * model TenantBranding {
 *   id                  String   @id @default(cuid())
 *   tenantId            String   @unique
 *   tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
 *
 *   logoUrl             String
 *   primaryColor        String   @default("#000000")
 *   secondaryColor      String   @default("#ffffff")
 *   accentColor         String   @default("#0066cc")
 *   fontFamily          String   @default("'Montserrat', sans-serif")
 *   appName             String
 *   splashScreenUrl     String?
 *   deepLinkScheme      String
 *
 *   createdAt           DateTime @default(now())
 *   updatedAt           DateTime @updatedAt
 *
 *   @@index([tenantId])
 * }
 *
 * Auf Tenant.prisma hinzufügen:
 *   branding TenantBranding?
 */
