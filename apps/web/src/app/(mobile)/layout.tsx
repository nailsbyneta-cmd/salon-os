import type { Metadata, Viewport } from 'next';
import { MobileShell } from '@/components/mobile-shell';

export const metadata: Metadata = {
  title: 'SALON OS Staff',
  manifest: '/m/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SALON OS',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

/**
 * Mobile Staff-Layout. Bottom-Tab-Navigation, optimiert für
 * Single-Thumb-Reach (Diff #22). Rendert unter /m/*.
 */
export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <MobileShell>{children}</MobileShell>;
}
