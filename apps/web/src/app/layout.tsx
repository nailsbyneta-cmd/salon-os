import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SALON OS',
  description: 'Die globale Plattform für Beauty-, Wellness- und Spa-Businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="de-CH">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
