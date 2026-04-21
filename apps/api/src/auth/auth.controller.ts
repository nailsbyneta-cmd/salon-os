import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { z } from 'zod';
import type { FastifyReply } from 'fastify';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { AuthService } from './auth.service.js';

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

const magicLinkExchangeSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(64),
  tenantSlug: z.string().min(1).max(80).optional(),
});

const SESSION_COOKIE_NAME = 'salon_session';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  /**
   * Stößt den Versand eines Magic-Links an. Immer 202 + `{ dispatched: true }`,
   * unabhängig davon, ob die E-Mail im System ist — Enumeration-Schutz.
   */
  @Post('magic-link')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestMagicLink(
    @Body(new ZodValidationPipe(magicLinkRequestSchema))
    body: z.infer<typeof magicLinkRequestSchema>,
  ): Promise<{ dispatched: true }> {
    await this.svc.requestMagicLink(body.email).catch(() => ({ dispatched: false }));
    return { dispatched: true };
  }

  /**
   * Wandelt Magic-Code in Session-Cookie um. Response enthält den Token
   * NICHT im Body — Cookie wird httpOnly gesetzt.
   */
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body(new ZodValidationPipe(magicLinkExchangeSchema))
    body: z.infer<typeof magicLinkExchangeSchema>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ ok: true; tenantId: string; role: string }> {
    const { token, session } = await this.svc.authenticate(body);

    reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: session.expiresAt - Math.floor(Date.now() / 1000),
    });

    return { ok: true, tenantId: session.tenantId, role: session.role };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }
}
