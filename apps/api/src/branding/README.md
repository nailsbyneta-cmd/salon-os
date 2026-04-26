# White-Label Branding Module

White-Label Branding ermöglicht Salon-OS Kunden, ihre eigenen gebrandeten Mobile-Apps zu veröffentlichen — anstatt eine generische "Salon-OS App" zu benutzen.

## Features

- **Salon-spezifische Design-Systeme:** Logo, Farben, Fonts
- **App-Branding:** Custom App-Name, Splash-Screen, Deep-Link-Schema
- **Public API:** Client-Apps können Branding ohne Auth fetchen
- **Multi-Location Support:** Jeder Tenant kann sein eigenes Branding pflegen

## API Endpoints

### GET `/v1/branding/:tenantSlug`

Holt Branding-Konfiguration für einen Salon.

**Öffentlich** (kein Auth erforderlich).

Response:

```json
{
  "tenantSlug": "beautycenter-by-neta",
  "logoUrl": "https://cdn.example.com/beautycenter-by-neta/logo.svg",
  "primaryColor": "#0A0A0A",
  "secondaryColor": "#FAF8F5",
  "accentColor": "#C8A96E",
  "fontFamily": "'Playfair Display', Georgia, serif",
  "appName": "Beauty Center Neta",
  "splashScreenUrl": "https://cdn.example.com/beautycenter-by-neta/splash.png",
  "deepLinkScheme": "beautycenter-neta://"
}
```

### POST `/v1/branding/:tenantSlug`

Erstellt oder aktualisiert Branding.

**Auth erforderlich:** Tenant-Admin

Request:

```json
{
  "logoUrl": "https://new-logo.png",
  "primaryColor": "#1a1a1a",
  "fontFamily": "'Inter', sans-serif"
}
```

## Implementation Status

**Aktuell:** Stub mit Demo-Daten (hardcoded für beautycenter-by-neta).

**TODO:**

1. Prisma Schema Migration hinzufügen (siehe `branding.dto.ts`)
2. DB-Queries in `branding.service.ts` implementieren
3. Auth-Guards in `branding.controller.ts` aktivieren
4. Image-Upload für Logo + Splash-Screen (AWS S3 Integration)
5. RLS-Policy für Tenant-Isolation

## Usage in Client-Apps

### React Native / Expo

```typescript
import { useEffect, useState } from 'react';

export function App() {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    const fetchBranding = async () => {
      const response = await fetch('https://api.salon-os.com/v1/branding/beautycenter-by-neta');
      const data = await response.json();
      setBranding(data);
    };

    fetchBranding();
  }, []);

  if (!branding) return null;

  return (
    <View style={{
      backgroundColor: branding.primaryColor,
      fontFamily: branding.fontFamily
    }}>
      <Image
        source={{ uri: branding.logoUrl }}
        style={{ width: 100, height: 100 }}
      />
      <Text>{branding.appName}</Text>
    </View>
  );
}
```

### iOS (Swift)

```swift
struct BrandingConfig: Codable {
  let logoUrl: URL
  let primaryColor: String
  let appName: String
  // ...
}

class BrandingManager: ObservableObject {
  @Published var config: BrandingConfig?

  func fetchBranding(tenantSlug: String) {
    let url = URL(string: "https://api.salon-os.com/v1/branding/\(tenantSlug)")!
    URLSession.shared.dataTask(with: url) { data, _, _ in
      if let data = data,
         let config = try? JSONDecoder().decode(BrandingConfig.self, from: data) {
        DispatchQueue.main.async {
          self.config = config
        }
      }
    }.resume()
  }
}
```

## Farben-Beispiele (Beautycenter by Neta)

- **Primary (Dark):** `#0A0A0A` — Hauptnavigation, Text
- **Secondary (Cream):** `#FAF8F5` — Cards, Hintergrund
- **Accent (Gold):** `#C8A96E` — CTA Buttons, Highlights

Folgt Apple Design-System (Darks for text, Light for cards).

## Sicherheit

- **Public Endpoints:** Branding ist intentional öffentlich (notwendig für Client-Apps)
- **Write Access:** Nur Tenant-Admin darf Branding ändern (Auth-Guard)
- **RLS:** Tenant sieht nur sein eigenes Branding
- **Image Uploads:** S3 mit signed URLs (später implementieren)

## Future: Image CDN Integration

Alle Image-URLs sollten über einen CDN laufen (CloudFlare, Akamai):

```
logoUrl: "https://cdn.salon-os.com/tenants/{tenantId}/logo.{ext}"
splashScreenUrl: "https://cdn.salon-os.com/tenants/{tenantId}/splash.{ext}"
```

Compression + Optimization via CloudFlare Image Resizing.
