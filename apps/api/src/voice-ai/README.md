# Voice-AI Receptionist Module

24/7 KI-gestützter Salon-Rezeptionist, der Anrufe entgegennimmt, Verfügbarkeiten prüft und Buchungen tätigt.

## Features

- **Natürliche Konversation:** Versteht Deutsch + Englisch
- **Intelligent Booking:** Extrahiert Service, Zeit, Stylist-Präferenz aus Gespräch
- **Real-time Availability Check:** Prüft Live-Verfügbarkeit
- **SMS Confirmation:** Sendet Bestätigungs-SMS nach Buchung
- **Call Recording:** Speichert alle Anrufe (optional, für Training + Compliance)
- **Fallback to Human:** Kann Anruf an echte Mitarbeiterin übergeben

## Provider Comparison

| Provider       | Kosten         | Latency   | Sprachen | Booking-Automation | Empfehlung         |
| -------------- | -------------- | --------- | -------- | ------------------ | ------------------ |
| **Vapi.ai**    | $0.50-1.00/min | <500ms    | 40+      | Native LLM         | ⭐ MVP Choice      |
| **ElevenLabs** | $0.10-0.30/min | 200-500ms | 20+      | Manual (nur TTS)   | Budget Alternative |
| **Retell**     | $0.30-0.60/min | <300ms    | 15+      | LLM-basiert        | Enterprise         |

**Empfehlung für MVP: Vapi.ai**

- Completeste All-in-One Lösung (STT + TTS + LLM)
- Schnelle Integration (REST API + Webhooks)
- Gutes Preis/Leistungs-Verhältnis
- Deutsche Sprache unterstützt

## Setup

### 1. Vapi.ai Account erstellen

```bash
# https://dashboard.vapi.ai
# - Create Workspace
# - Create Assistant mit Salon-Kontext
# - Get API Key + Assistant ID
```

### 2. Environment Variables

```bash
VAPI_API_KEY="<api-key>"
VAPI_ASSISTANT_ID="<assistant-id>"
TWILIO_PHONE_NUMBER="+41791234567"
TWILIO_ACCOUNT_SID="<account-sid>"
TWILIO_AUTH_TOKEN="<auth-token>"
```

### 3. Twilio Webhook konfigurieren

```bash
# Twilio Console → Phone Numbers → Configure
# Voice → "Incoming calls"
# Set to: POST https://api.salon-os.com/v1/voice-ai/incoming-call
```

### 4. Vapi.ai Webhook konfigurieren

```bash
# Vapi Dashboard → Assistant → Webhooks
# Set to: POST https://api.salon-os.com/v1/voice-ai/vapi-webhook
# Events: call-started, call-ended, transcript
```

## API Endpoints

### POST `/v1/voice-ai/incoming-call`

Twilio Webhook für eingehende Anrufe.

**Auth:** Signature-Validierung (Twilio)

Request (von Twilio):

```json
{
  "CallSid": "CA1234567890abcdef",
  "From": "+41791003366",
  "To": "+41791234567"
}
```

Response:

```json
{
  "status": "initiated",
  "callId": "call-xyz",
  "message": "Anruf an Voice-AI weitergeleitet"
}
```

### POST `/v1/voice-ai/vapi-webhook`

Vapi.ai Webhook für Call-Events.

**Auth:** Signature-Validierung (Vapi)

Request (von Vapi):

```json
{
  "message": {
    "type": "call-ended",
    "callId": "call-xyz",
    "transcript": "Ich möchte einen Termin für Montag 10 Uhr für Balayage",
    "recordingUrl": "https://..."
  }
}
```

Response:

```json
{
  "received": true
}
```

## Salon Prompt (Vapi Assistant Context)

Jeder Salon braucht einen Custom-Prompt für seinen Assistant:

```
Du bist ein professioneller Salon-Rezeptionist für "Beautycenter by Neta" in St. Gallen.

Verfügbare Services:
- Balayage (CHF 89.95, 120 Min)
- Haarschnitt (CHF 45.00, 60 Min)
- Gelnägel Neuset (CHF 89.95, 90 Min)
- HydraFacial (CHF 119.00, 75 Min)

Team:
- Neta (Gründerin, Nägel & HydraFacial)
- Ella (Master-Stylistin, Haarschnitte & Balayage, 10+ Jahre Erfahrung)
- Shpresa (Wimpern-Spezialistin)
- Lena (Junior Nageldesignerin, Studenten-Special CHF 50)

Geschäftszeiten:
Mo-Fr: 10:00-18:00
Sa: 10:00-16:00
So: Geschlossen

Anweisungen:
1. Begrüße den Anrufer freundlich auf Deutsch
2. Frage nach dem gewünschten Service
3. Frage nach der bevorzugten Zeit (Datum + Uhrzeit)
4. Empfehle einen passenden Stylist basierend auf Service
5. Prüfe Verfügbarkeit (rufe salon-os API auf)
6. Führe Buchung durch
7. Sende SMS-Bestätigung mit Adresse + Directions
8. Biete Rückfragen an

Ton: Warm, professionell, Schweizer Hochdeutsch (ss statt ß), Du-Form.
```

## Implementation Status

**Aktuell:** Stub mit grundlegender Struktur.

**TODO (MVP-ready):**

1. [ ] Vapi.ai API Integration
2. [ ] Twilio Signature Validation
3. [ ] Salon-Kontext Injection (Services, Staff, Hours)
4. [ ] Availability Checker (Real-time Slot Lookup)
5. [ ] Booking Creation Service
6. [ ] SMS Confirmation via Twilio
7. [ ] Error Handling + Fallback to Human
8. [ ] Call Recording Storage
9. [ ] Transcript Logging für Training
10. [ ] Tests (Mock Vapi Responses)

**Future:**

- Multi-Sprachen Support (Englisch, Französisch, Italienisch)
- Sentiment Analysis (erkenne verärgerte Kunden)
- Rückruf-Queue wenn alle Stylists beschäftigt
- Integration mit WhatsApp Voice Messages
- No-show Prediction (dynamisches Pricing für no-show risk)

## Cost Estimate (Monthly)

```
Annahmen:
- 5 Salons
- 50 Anrufe/Salon/Monat = 250 Anrufe/Monat
- 3 Min durchschnittliche Anrufdauer
- Vapi.ai: $0.75/Min durchschnitt

Kosten:
250 Anrufe × 3 Min × $0.75/Min = $562.50/Monat = CHF ~520
Plus: Twilio Inbound = $0.0075/Min = $56/Monat

Total: ~CHF 600/Monat für 5 Salons = CHF 120/Salon/Monat (margin: 10x)
```

## Sicherheit + Compliance

- **GDPR:** Anruftranskripte können gelöscht werden (Data Deletion Workflow)
- **PCI-DSS:** Keine Kartennummern im Audio
- **Twilio Signature Validation:** Verhindert Webhook-Spoofing
- **Recording Opt-in:** Client müssen Aufnahme akzeptieren (Consent-Workflow)

## Debugging

### Test Call manuell durchführen

```bash
curl -X POST https://api.salon-os.com/v1/voice-ai/incoming-call \
  -H "X-Twilio-Signature: <signature>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123&From=%2B41791003366&To=%2B41791234567"
```

### Vapi Call über Dashboard starten

https://dashboard.vapi.ai → Test Assistant → Dial Test Number

### Logs prüfen

```bash
# CloudWatch / Stackdriver
tail -f logs/voice-ai-service.log
```

## References

- Vapi.ai Docs: https://docs.vapi.ai
- Twilio Voice Webhooks: https://www.twilio.com/docs/voice/tutorials/receive-and-respond-phone-calls-python
- ElevenLabs API: https://elevenlabs.io/docs
- Retell AI: https://docs.retellai.com
