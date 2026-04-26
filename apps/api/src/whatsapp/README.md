# WhatsApp Business Module

WhatsApp-integrierte Buchungen und Kundenbetreuung via Meta Cloud API.

## Features

- **Conversational Booking:** "Ich möchte Montag 10 Uhr Balayage" → Termin erstellt
- **Intent Extraction:** LLM-basierte Anfrage-Klassifizierung
- **Message Templates:** Pre-approved für GDPR-konformität
- **Two-Way Messaging:** Kunden können antworten, Salon kann reagieren
- **Audit Trail:** Alle Nachrichten geloggt für Compliance
- **Broadcast:** Einseitige Kampagnen (Birthday offers, Reminders)

## Setup

### 1. Meta Business Account vorbereiten

```bash
# https://business.facebook.com
# - Create Business Account (falls nicht vorhanden)
# - Verify Business (notwendig für WhatsApp API)
# - Create App (type: Business)
# - Add WhatsApp Product
```

### 2. WhatsApp Business Account verknüpfen

```bash
# Meta App Dashboard → WhatsApp → Getting Started
# - Link Existing Business Phone Number ODER kaufe neue
# - Phone Number: wird verwendet für Salon-Nachrichten
# - Display Name: "Beautycenter by Neta" (sichtbar für Kunden)
```

### 3. Environment Variables

```bash
WHATSAPP_BUSINESS_PHONE_ID="<phone-id>" # Z.B. 123456789
WHATSAPP_API_ACCESS_TOKEN="<access-token>" # Longlived, mit whatsapp_business_messaging scope
WHATSAPP_VERIFY_TOKEN="<custom-secret>" # Selbst definiert, für Webhook-Verifizierung
```

### 4. Webhook konfigurieren

Meta Dashboard → App → Products → WhatsApp → Configuration

**Webhook URL:** `https://api.salon-os.com/v1/whatsapp/webhook`

**Verify Token:** (Value aus Env-Var oben)

**Subscribe to events:** `messages`, `message_status`, `message_template_status_update`

### 5. Message Templates erstellen

Meta App Dashboard → WhatsApp → Message Templates

Pre-approved Templates (für Compliance mit Meta Policies):

#### Template 1: Booking Confirmation

```
Name: booking_confirmation
Language: de (Deutsch)

Header: (Optional) Logo/Image

Body:
Hallo {{1}},

dein Termin wurde bestätigt!

📅 {{2}}
🕐 {{3}}
📍 {{4}}

Bestätigungscode: {{5}}

Bei Fragen: +41 79 100 33 66

---

Footer: Beautycenter by Neta

Buttons: [ICAL Download], [Directions]
```

#### Template 2: Service Reminder

```
Name: service_reminder
Language: de

Body:
Hallo {{1}},

dein {{2}} steht an!

📅 {{3}} um {{4}}

Bestätigungscode: {{5}}

Absagen: Reply "CANCEL {{5}}"
Verschieben: Reply "RESCHEDULE {{5}}"
```

### 6. Test

```bash
# Webhook verifizieren
curl "https://api.salon-os.com/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=test"
# Expected: "test"

# Test-Nachricht senden (Meta Simulator)
# Meta Dashboard → WhatsApp → API Setup → Send Test Message
```

## API Endpoints

### GET `/v1/whatsapp/webhook`

Webhook Verification (called by Meta).

Query:

- `hub.mode`: "subscribe"
- `hub.verify_token`: Token aus Env-Var
- `hub.challenge`: Challenge-String

Response: Plain text challenge (wenn Token korrekt)

### POST `/v1/whatsapp/webhook`

Empfängt eingehende Nachrichten (called by Meta).

Request:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "messages": [
              {
                "from": "+41791003366",
                "id": "wamsg_xyz",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Ich möchte Montag 10 Uhr Balayage"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

Response: `{ "status": "booking_processed" }` (200 OK)

### POST `/v1/whatsapp/send-confirmation`

Sendet Bestätigungs-Nachricht.

Auth: Tenant-Owner

Request:

```json
{
  "phone": "+41791003366",
  "serviceId": "service_balayage",
  "serviceName": "Balayage",
  "startTime": "2026-05-12T10:00:00Z",
  "location": "Kräzernstrasse 79, St. Gallen",
  "confirmationCode": "BOOK-123456"
}
```

Response:

```json
{
  "messageId": "wamsg_xyz",
  "status": "queued"
}
```

## Intent Extraction (LLM-based)

Aktuell: Naive Regex-Matching

TODO: Implement Claude/GPT-based extraction:

```python
message = "Ich möchte Montag 10 Uhr für Balayage buchen, aber nur wenn Ella frei ist"

intent = llm.classifyIntent(message)
# Output: {
#   "type": "booking",
#   "service": "balayage",
#   "preferredDate": "Monday",
#   "preferredTime": "10:00",
#   "preferredStylist": "Ella",
#   "confidence": 0.95
# }
```

**Prompt-Template für Intent-Extraction:**

```
Du bist ein Salon-Booking-Intent-Parser. Extrahiere aus der Nachricht:
1. Service (balayage, nails, lashes, hydrafacial, coiffure, extensions, other)
2. Preferred Date (Monday, "next week", "tomorrow", etc.)
3. Preferred Time (10:00, "morning", "afternoon")
4. Preferred Stylist (if mentioned)
5. Confidence (0.0-1.0)

Antworte ONLY als JSON. Wenn kein Booking-Intent erkannt, return {"type": "enquiry"}

Nachricht: "{message}"
```

## Sicherheit + Compliance

### GDPR

- Phone numbers werden nur gespeichert wenn explizit zugestimmt
- Data Deletion: Kunde kann sagen "DELETE my data" → alle Konversationen gelöscht
- Opt-out: "UNSUBSCRIBE" → automatisch vom Marketing-Pool entfernt

### Meta Policies

- Messages werden nur via pre-approved Templates gesendet (nicht freier Text)
- Templates müssen von Meta genehmigt werden
- Sender Phone wird angezeigt (keine Spoofing)

### Idempotency

- Jede Message hat `message.id` → Duplikate erkennen
- Bookings dürfen nicht doppelt erstellt werden

## Kosten

```
Meta WhatsApp Pricing (2026):
- Eingehende Nachrichten: $0.001 pro Nachricht
- Ausgehende Nachrichten:
  - Utility Templates (Transaktional): $0.0075
  - Marketing Templates: $0.0075
  - Service Templates: $0.01

Annahmen:
- 500 Salons
- 50 Bookings/Monat = 25k Bookings
- 25k confirmations @ $0.0075 = $187.50

Plus:
- Inbound messages: 25k @ $0.001 = $25
- Infrastructure: ~$100/month

Total: ~$312/month = CHF ~320/month

Per Salon (bei 25 Bookings/Monat): CHF ~0.64/Booking
```

## Workflow: End-to-End

```
1. Kunde schreibt: "Montag 10 Uhr Balayage"
   ↓
2. Webhook kommt rein: POST /v1/whatsapp/webhook
   ↓
3. Intent Extraction: { type: "booking", service: "balayage", date: "Monday", time: "10:00" }
   ↓
4. Availability Check: Gibt es freie Slots Montag 10:00?
   ↓
5. Booking erstellen: appointment_id = abc123
   ↓
6. Template rendern: booking_confirmation { name, date, time, location, code }
   ↓
7. Meta API call: POST /messages mit template_name + parameters
   ↓
8. Bestätigung per WhatsApp: "Hallo Anna, dein Termin ist bestätigt! Mo 12.5., 10:00 ..."
   ↓
9. Audit Log: { tenantId, messageId, status: "confirmed", timestamp }
```

## Future Enhancements

- [ ] Sentiment Analysis (erkenne frustrierte Kunden)
- [ ] Rescheduling via Reply ("RESCHEDULE bc-123 → neue Zeit anbieten)
- [ ] Group Booking (5 Freundinnen buchen gemeinsam)
- [ ] Payment Link (Link in Nachricht für Deposit-Zahlung)
- [ ] Live Chat Fallback (bei komplexen Fragen zu Mensch übergeben)
- [ ] Integration mit WhatsApp Status Updates (Marketing Layer)
- [ ] Broadcast zu Loyalty-Membern (Exclusive Offers)

## References

- Meta WhatsApp API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Message Templates: https://developers.facebook.com/docs/whatsapp/message-templates
- Webhooks: https://developers.facebook.com/docs/whatsapp/webhooks
