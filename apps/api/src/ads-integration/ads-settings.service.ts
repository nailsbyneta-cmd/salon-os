import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { encryptSecret } from '@salon-os/utils/crypto';
import { PRISMA } from '../db/db.module.js';

export interface AdsIntegrationStatus {
  configured: boolean;
  enabled: boolean;
  customerId: string | null;
  loginCustomerId: string | null;
  /** Maskiert: 'set' wenn vorhanden, sonst 'unset'. Plaintext NIE rausgeben. */
  refreshTokenStatus: 'set' | 'unset';
  conversionActions: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface AdsIntegrationInput {
  customerId: string;
  loginCustomerId?: string | null;
  /** Bei Update: weglassen wenn der existierende Token erhalten bleiben soll. */
  refreshToken?: string;
  enabled?: boolean;
  /** {  _meta: {...}, booking_completed: 'AW-X/Label', ... } */
  conversionActions?: Record<string, unknown>;
}

@Injectable()
export class AdsSettingsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getStatus(tenantId: string): Promise<AdsIntegrationStatus> {
    const row = await this.prisma.tenantAdsIntegration.findFirst({
      where: { tenantId, provider: 'google_ads' },
    });
    if (!row) {
      return {
        configured: false,
        enabled: false,
        customerId: null,
        loginCustomerId: null,
        refreshTokenStatus: 'unset',
        conversionActions: {},
        lastSyncAt: null,
        lastSyncError: null,
      };
    }
    return {
      configured: true,
      enabled: row.enabled,
      customerId: row.customerId,
      loginCustomerId: row.loginCustomerId,
      refreshTokenStatus: row.refreshTokenEncrypted ? 'set' : 'unset',
      conversionActions: (row.conversionActions ?? {}) as Record<string, unknown>,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
    };
  }

  async upsert(tenantId: string, input: AdsIntegrationInput): Promise<AdsIntegrationStatus> {
    const existing = await this.prisma.tenantAdsIntegration.findFirst({
      where: { tenantId, provider: 'google_ads' },
    });

    const payload: Record<string, unknown> = {
      customerId: input.customerId,
      loginCustomerId: input.loginCustomerId ?? null,
      enabled: input.enabled ?? true,
    };
    if (input.conversionActions) {
      payload['conversionActions'] = input.conversionActions;
    }
    if (input.refreshToken) {
      payload['refreshTokenEncrypted'] = encryptSecret(input.refreshToken);
    }

    if (existing) {
      // refreshTokenEncrypted nur überschreiben wenn neuer Token kommt
      if (!input.refreshToken) {
        delete payload['refreshTokenEncrypted'];
      }
      await this.prisma.tenantAdsIntegration.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      // Bei NEW Integration ist refreshToken Pflicht
      if (!input.refreshToken) {
        throw new Error(
          'refreshToken ist Pflicht beim ersten Anlegen der Integration.',
        );
      }
      await this.prisma.tenantAdsIntegration.create({
        data: {
          tenantId,
          provider: 'google_ads',
          customerId: input.customerId,
          loginCustomerId: input.loginCustomerId ?? null,
          refreshTokenEncrypted: encryptSecret(input.refreshToken),
          conversionActions: (input.conversionActions ?? {}) as object,
          enabled: input.enabled ?? true,
        },
      });
    }
    return this.getStatus(tenantId);
  }

  async disable(tenantId: string): Promise<AdsIntegrationStatus> {
    const existing = await this.prisma.tenantAdsIntegration.findFirst({
      where: { tenantId, provider: 'google_ads' },
    });
    if (existing) {
      await this.prisma.tenantAdsIntegration.update({
        where: { id: existing.id },
        data: { enabled: false },
      });
    }
    return this.getStatus(tenantId);
  }

  async remove(tenantId: string): Promise<void> {
    await this.prisma.tenantAdsIntegration.deleteMany({
      where: { tenantId, provider: 'google_ads' },
    });
  }
}
