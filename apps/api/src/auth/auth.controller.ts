import { Controller, Get, Post, Query, Res, ServiceUnavailableException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';

/**
 * Public Auth-Endpoints. Path-Prefix `/v1/public/auth/` damit die
 * TenantMiddleware sie nicht blockt (Login muss vor jeder Auth gehen).
 */
@Controller('v1/public/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('login')
  async login(
    @Query('redirect') redirect: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!this.auth.isEnabled()) {
      throw new ServiceUnavailableException(
        'WorkOS Auth nicht konfiguriert (WORKOS_API_KEY / WORKOS_CLIENT_ID / WORKOS_COOKIE_PASSWORD fehlen).',
      );
    }
    const url = this.auth.getAuthorizationUrl(redirect);
    void res.status(302).header('location', url).send();
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!this.auth.isEnabled()) {
      throw new ServiceUnavailableException('WorkOS Auth nicht konfiguriert.');
    }
    const webBase = process.env['PUBLIC_WEB_URL_BASE'] ?? 'http://localhost:3000';
    if (error) {
      void res
        .status(302)
        .header('location', `${webBase}/login?error=${encodeURIComponent(error)}`)
        .send();
      return;
    }
    if (!code) {
      void res.status(302).header('location', `${webBase}/login?error=missing_code`).send();
      return;
    }

    try {
      const { sealed } = await this.auth.handleCallback(code);
      const target =
        state && /^%2F[A-Za-z0-9_/.\-?=&%]+$/.test(state) ? decodeURIComponent(state) : '/';
      void res
        .status(302)
        .header('set-cookie', this.auth.buildCookie(sealed))
        .header('location', `${webBase}${target}`)
        .send();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login fehlgeschlagen';
      void res
        .status(302)
        .header('location', `${webBase}/login?error=${encodeURIComponent(msg)}`)
        .send();
    }
  }

  @Post('logout')
  async logout(@Res() res: FastifyReply): Promise<void> {
    void res.status(204).header('set-cookie', this.auth.buildLogoutCookie()).send();
  }
}
