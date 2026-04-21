import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider, ThemeScript, ToastProvider } from '@salon-os/ui';
import { ConversionTracker } from '../components/conversion-tracker';
import { GoogleAnalytics } from '../components/google-analytics';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Beautycenter by Neta',
    template: '%s · Beautycenter by Neta',
  },
  description: 'Termine online buchen bei Beautycenter by Neta.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Beautyneta',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="de-CH" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-text-primary antialiased">
        <ThemeScript />
        <GoogleAnalytics />
        <ConversionTracker />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
