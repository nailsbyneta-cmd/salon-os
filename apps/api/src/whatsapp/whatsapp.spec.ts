import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsappService } from './whatsapp.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(() => {
    service = new WhatsappService();
  });

  describe('parseBookingIntent', () => {
    it('should extract balayage booking intent', () => {
      const result = service.parseBookingIntent(
        'Ich möchte Montag 10 Uhr Balayage',
        '+41791003366',
      );
      expect(result).toBeDefined();
      expect(result?.service).toBe('balayage');
      expect(result?.date).toBe('Montag');
      expect(result?.time).toContain('10');
    });

    it('should extract nails booking intent', () => {
      const result = service.parseBookingIntent(
        'Termin für Gelnägel Neuset nächste Woche',
        '+41791003366',
      );
      expect(result).toBeDefined();
      expect(result?.service).toBe('nails');
    });

    it('should return null for non-booking messages', () => {
      const result = service.parseBookingIntent(
        'Wann seid ihr offen?',
        '+41791003366',
      );
      expect(result).toBeNull();
    });
  });

  describe('answerEnquiry', () => {
    it('should answer hours enquiry', async () => {
      const result = await service.answerEnquiry(
        'Wann seid ihr offen?',
        'tenant-123',
      );
      expect(result).toContain('10:00-18:00');
    });

    it('should answer price enquiry', async () => {
      const result = await service.answerEnquiry(
        'Was kostet Balayage?',
        'tenant-123',
      );
      expect(result).toBeDefined();
    });
  });
});
