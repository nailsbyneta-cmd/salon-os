/**
 * SALON OS Auth package.
 * Dünner Wrapper um WorkOS Node-SDK + Session-Cookie-Handling.
 *
 * Noch kein WorkOS-Client — erst wenn API-Keys gesetzt sind.
 * Typen + Helfer schon exportiert, damit apps gegen die Surface
 * programmieren können.
 */
import { z } from 'zod';

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['OWNER', 'MANAGER', 'FRONT_DESK', 'STYLIST', 'BOOTH_RENTER', 'TRAINEE', 'ASSISTANT']),
  email: z.string().email(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export type Session = z.infer<typeof sessionSchema>;

export function isManager(role: Session['role']): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function isOwner(role: Session['role']): boolean {
  return role === 'OWNER';
}
