import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat, Playfair_Display } from 'next/font/google';
import { ThemeProvider, ThemeScript, ToastProvider } from '@salon-os/ui';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Beautyneta-Brand: Montserrat (Body) + Playfair Display (Headlines).
// Gleiche Schriften wie beautyneta.ch — durchgängige Brand-Experience
// zwischen Marketing-Site und Booking-Flow.
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
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
    title: 'Beautycenter by Neta',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html
      lang="de-CH"
      className={`${inter.variable} ${montserrat.variable} ${playfair.variable}`}
      data-product-theme="salon-os"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-text-primary antialiased">
        <ThemeScript />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
