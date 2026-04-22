import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 110,
        fontWeight: 700,
        letterSpacing: -4,
        borderRadius: 36,
      }}
    >
      n
    </div>,
    { ...size },
  );
}
