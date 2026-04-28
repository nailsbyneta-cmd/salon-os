import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
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
        fontSize: 110,
        fontWeight: 600,
        fontFamily: 'serif',
        letterSpacing: -4,
        borderRadius: 36,
      }}
    >
      n
    </div>,
    { ...size },
  );
}
