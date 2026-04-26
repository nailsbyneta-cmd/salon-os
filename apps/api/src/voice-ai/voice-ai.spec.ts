import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { VoiceAiService } from './voice-ai.service.js';

describe('VoiceAiService', () => {
  let service: VoiceAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'PrismaService',
          useValue: {},
        },
        VoiceAiService,
      ],
    }).compile();

    service = module.get<VoiceAiService>(VoiceAiService);
  });

  describe('handleIncomingCall', () => {
    it('should process incoming call', async () => {
      const result = await service.handleIncomingCall('+41791003366', {
        CallSid: 'CA123',
      });
      expect(result).toBeDefined();
      expect(result.status).toBe('initiated');
    });

    it('should throw on missing callerId', async () => {
      await expect(service.handleIncomingCall('', {})).rejects.toThrow();
    });
  });
});
