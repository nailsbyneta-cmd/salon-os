import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BrandingController } from './branding.controller.js';
import { BrandingService } from './branding.service.js';

describe('BrandingController', () => {
  let controller: BrandingController;
  let service: BrandingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandingController],
      providers: [
        {
          provide: BrandingService,
          useValue: {
            getBrandingByTenantSlug: jest.fn().mockResolvedValue({
              tenantSlug: 'test-salon',
              logoUrl: 'https://example.com/logo.svg',
              primaryColor: '#000000',
              secondaryColor: '#ffffff',
              accentColor: '#0066cc',
              fontFamily: "'Montserrat', sans-serif",
              appName: 'Test Salon App',
              deepLinkScheme: 'testsalon://',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BrandingController>(BrandingController);
    service = module.get<BrandingService>(BrandingService);
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
