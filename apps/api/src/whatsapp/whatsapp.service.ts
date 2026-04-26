import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Service für WhatsApp Business API Integration.
 * Empfängt Nachrichten, extrahiert Buchungs-Intent, speichert Bookings.
 *
 * TODO: Meta Business Account + WhatsApp Cloud API Setup.
 * Aktuell: Stub mit LLM-Placeholder für Intent-Extraction.
 *
 * Dokumentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Kosten: $0.001 pro eingehende Nachricht (Meta Billing)
 */
@Injectable()
export class WhatsappService {
  private readonly whatsappBusinessPhoneId = process.env['WHATSAPP_BUSINESS_PHONE_ID'];
  private readonly whatsappApiAccessToken = process.env['WHATSAPP_API_ACCESS_TOKEN'];

  /**
   * Parst WhatsApp Nachricht und extrahiert Buchungs-Intent.
   *
   * TODO: Implement LLM-based Intent Extraction.
   * Aktuell: Naive Regex-Matching als Fallback.
   *
   * Intent-Beispiele:
   * - "Ich möchte Montag 10 Uhr Balayage" → { service: 'balayage', date: 'Monday', time: '10:00' }
   * - "Termin für Nägel nächste Woche" → { service: 'nails', date: 'next week' }
   * - "Wann seid ihr offen?" → { type: 'hours_enquiry' }
   *
   * @param message Eingehende WhatsApp Text-Nachricht
   * @param senderPhone Telefonnummer des Senders (mit +)
   * @returns BookingIntent oder null wenn kein Intent erkannt
   */
  parseBookingIntent(message: string, senderPhone: string): BookingIntent | null {
    const lowerMsg = message.toLowerCase();

    // TODO: Replace mit Claude/GPT Intent-Extraction Call
    // const intent = await this.llm.classifyIntent(message);
    // if (!intent.isBooking) return null;
    // return {
    //   type: 'booking',
    //   service: intent.service,
    //   date: intent.preferredDate,
    //   time: intent.preferredTime,
    //   clientPhone: senderPhone,
    // };

    // Naive Fallback-Logik
    const serviceKeywords = {
      balayage: ['balayage', 'färben', 'coloration'],
      nails: ['nägel', 'nagel', 'nail', 'gelnägel'],
      lashes: ['wimpern', 'lashes', 'verlängerung'],
      hydrafacial: ['gesicht', 'facial', 'hydra'],
      coiffure: ['haarschnitt', 'schnitt', 'haircut'],
      extensions: ['extensions', 'haarverlängerung'],
    };

    let detectedService: string | null = null;
    for (const [service, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some((kw) => lowerMsg.includes(kw))) {
        detectedService = service;
        break;
      }
    }

    if (!detectedService) return null;

    // Einfache Datum/Zeit-Extraktion
    const dateMatch = lowerMsg.match(
      /\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|nächste woche|heute)\b/i,
    );
    const timeMatch = lowerMsg.match(/(\d{1,2}):?(\d{2})?\s*(uhr|h)?/);

    return {
      type: 'booking',
      service: detectedService,
      date: dateMatch?.[1] || 'unspecified',
      time: timeMatch?.[0] || 'unspecified',
      clientPhone: senderPhone,
    };
  }

  /**
   * Sendet Buchungs-Bestätigungsnachricht via WhatsApp.
   *
   * TODO: Implement Meta Cloud API Call.
   * Benutze WhatsApp Message Templates für Compliance.
   *
   * @param phone Zieltelefonnummer
   * @param booking Buchungsdaten
   */
  async sendBookingConfirmation(
    phone: string,
    booking: {
      serviceId: string;
      serviceName: string;
      startTime: Date;
      location: string;
      confirmationCode: string;
    },
  ): Promise<{ messageId: string; status: 'sent' | 'queued' }> {
    // TODO: Implement Meta Cloud API
    // const response = await fetch(`https://graph.instagram.com/v18.0/${this.whatsappBusinessPhoneId}/messages`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.whatsappApiAccessToken}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: phone,
    //     type: 'template',
    //     template: {
    //       name: 'booking_confirmation', // Pre-approved template
    //       language: { code: 'de_CH' },
    //       parameters: {
    //         body: {
    //           parameters: [
    //             booking.serviceName,
    //             new Date(booking.startTime).toLocaleDateString('de-CH'),
    //             new Date(booking.startTime).toLocaleTimeString('de-CH'),
    //             booking.location,
    //             booking.confirmationCode,
    //           ],
    //         },
    //       },
    //     },
    //   }),
    // });

    console.warn('[WhatsappService] Stub: sendBookingConfirmation - würde Meta API aufrufen');

    return {
      messageId: `wamsg-${Date.now()}`,
      status: 'queued',
    };
  }

  /**
   * Antwortet auf allgemeine Enquiries (Öffnungszeiten, Preise, etc.).
   *
   * TODO: Implement Knowledge-Base Lookup.
   * Aktuell: Hardcoded Responses als Demo.
   *
   * @param question Kundenfrage
   * @param tenantId Salon-ID
   * @returns Antwort-Text
   */
  async answerEnquiry(question: string, tenantId: string): Promise<string> {
    const lowerQuestion = question.toLowerCase();

    // TODO: Implement Semantic Search auf Knowledge Base
    // const answer = await this.knowledgeBase.search(question, tenantId);
    // if (answer.confidence > 0.8) return answer.text;

    // Demo-Responses
    if (
      lowerQuestion.includes('öffnungszeit') ||
      lowerQuestion.includes('hours') ||
      lowerQuestion.includes('wann')
    ) {
      return 'Unsere Öffnungszeiten: Mo-Fr 10:00-18:00, Sa 10:00-16:00, So geschlossen.';
    }

    if (lowerQuestion.includes('preis') || lowerQuestion.includes('preis')) {
      return 'Unsere Preise findest du auf unserer Website oder frag direkt! 😊';
    }

    if (lowerQuestion.includes('team') || lowerQuestion.includes('stylist')) {
      return 'Wir haben ein tolles Team! Neta, Ella, Shpresa und Lena. Wem kann ich dir empfehlen?';
    }

    return 'Danke für deine Frage! Um details zu erfahren, schreib uns oder ruf an. 📞';
  }
}

export interface BookingIntent {
  type: 'booking' | 'enquiry';
  service?: string;
  date?: string;
  time?: string;
  clientPhone?: string;
}
