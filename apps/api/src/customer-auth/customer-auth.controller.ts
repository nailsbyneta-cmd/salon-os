import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PRISMA } from '../db/db.module.js';
import { OutboxService } from '../common/outbox.service.js';
import { CustomerAuthService } from './customer-auth.service.js';

const slugParamSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

const requestLinkSchema = z.object({
  email: z.string().email().max(255),
});

const exchangeSchema = z.object({
  token: z.string().min(20).max(255),
});

/**
 * Public Customer-Self-Service-Login via Magic-Link + Session-Token.
 *
 * Flow:
 * 1. POST /v1/public/{slug}/me/request-link {email}
 *    → IMMER 200 (Privacy). Bei Match: Magic-Link-Mail via Outbox.
 *
 * 2. POST /v1/public/me/exchange {token}
 *    → Magic-Link-Token rein, Session-Token raus (30 Tage TTL)
 *    → Web-Layer setzt Session-Token als HTTP-Only-Cookie
 *
 * 3. GET /v1/public/me/profile mit Authorization: Bearer SESSION_TOKEN
 *    → Customer-Profil + ihre Termine
 *
 * 4. POST /v1/public/me/logout mit Authorization: Bearer SESSION_TOKEN
 *    → Session als revoked markiert
 */
@Controller('v1/public')
export class CustomerAuthController {
  constructor(
    private readonly svc: CustomerAuthService,
    private readonly outbox: OutboxService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  @Post(':tenantSlug/me/request-link')
  @HttpCode(HttpStatus.OK)
  async requestLink(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(new ZodValidationPipe(requestLinkSchema))
    body: { email: string },
  ): Promise<{ ok: true }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return { ok: true };

    const link = await this.svc.createLinkForEmail(tenant.id, body.email);
    if (link) {
      await this.outbox.writeForTenant(tenant.id, 'auth.magic_link', {
        tenantId: tenant.id,
        clientId: link.clientId,
        magicToken: link.token,
        tenantSlug: slug,
      });
    }
    return { ok: true };
  }

  @Post('me/exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body(new ZodValidationPipe(exchangeSchema)) body: { token: string },
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<{ ok: true; sessionToken: string; clientId: string; tenantId: string }> {
    const res = await this.svc.verifyAndCreateSession(body.token, userAgent ?? null);
    if (!res.ok) {
      throw new BadRequestException(`Magic-Link ${res.reason}`);
    }
    return res;
  }

  @Get('me/profile')
  async profile(
    @Headers('authorization') auth: string | undefined,
  ): Promise<Awaited<ReturnType<CustomerAuthService['getProfile']>>> {
    const token = parseBearer(auth);
    if (!token) throw new UnauthorizedException('Missing Bearer token');
    const session = await this.svc.verifySession(token);
    if (!session) throw new UnauthorizedException('Session invalid or expired');
    return this.svc.getProfile(session.clientId, session.tenantId);
  }

  @Post('me/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') auth: string | undefined): Promise<{ ok: true }> {
    const token = parseBearer(auth);
    if (token) await this.svc.revokeSession(token);
    return { ok: true };
  }
}

function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m?.[1] ?? null;
}
