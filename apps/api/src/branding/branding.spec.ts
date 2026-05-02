import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrandingController } from './branding.controller.js';
import type { BrandingService } from './branding.service.js';

const MOCK_BRANDING = {
  tenantSlug: 'test-salon',
  logoUrl: 'https://example.com/logo.svg',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  accentColor: '#0066cc',
  fontFamily: "'Montserrat', sans-serif",
  appName: 'Test Salon App',
  deepLinkScheme: 'testsalon://',
};

function makeService() {
  return {
    getBrandingByTenantSlug: vi.fn().mockResolvedValue(MOCK_BRANDING),
    upsertBranding: vi.fn().mockResolvedValue(MOCK_BRANDING),
  } as unknown as BrandingService;
}

describe('BrandingController', () => {
  let controller: BrandingController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new BrandingController(service);
  });

  describe('getBranding', () => {
    it('should return branding for valid tenant slug', async () => {
      const result = await controller.getBranding('test-salon');
      expect(result).toBeDefined();
      expect(result.appName).toBe('Test Salon App');
      expect(result.primaryColor).toBe('#000000');
    });

    it('should call service with validated slug', async () => {
      await controller.getBranding('my-salon');
      expect(service.getBrandingByTenantSlug).toHaveBeenCalledWith('my-salon');
    });

    it('should throw on invalid slug format', async () => {
      await expect(controller.getBranding('')).rejects.toThrow();
    });
  });

  describe('upsertBranding', () => {
    it('should update branding', async () => {
      const updateDto = { appName: 'New Name' };
      const result = await controller.upsertBranding('test-salon', updateDto);
      expect(result).toBeDefined();
    });
  });
});
