import type { Metadata } from 'next';

/**
 * Public-Booking-Layout. Kein Admin-Sidebar, kein Auth.
 * Dark-Mode forced via data-theme="dark" — matched die Beautyneta-Brand
 * (#0A0A0A dominant, Gold-Akzente). Admin-Shell bleibt Light Mode.
 */
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div data-theme="dark" className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10">{children}</div>
    </div>
  );
}
