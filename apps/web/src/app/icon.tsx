import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/**
 * App-Icon für PWA + Browser-Favicon. Brand-Match: Dark-Hintergrund
 * (#0A0A0A) mit goldenem N (#D0B07C) — gleiche Akzent-Farbe wie das
 * Hero-Eyebrow auf der Booking-Page. Maskable-safe: das N sitzt zentriert
 * mit ~17% Padding, damit Android-Adaptive-Icons (Round/Squircle) das
 * Symbol nicht abschneiden.
 */
export default function Icon(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#D0B07C',
        fontSize: 260,
        fontWeight: 600,
        fontFamily: 'serif',
        letterSpacing: -8,
      }}
    >
      n
    </div>,
    { ...size },
  );
}
