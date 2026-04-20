import type { Metadata } from 'next';

/**
 * Public-Booking-Layout. Kein Admin-Sidebar, kein Auth.
 * Nur dieses Layout setzt das Public-Booking-Manifest — damit
 * das Admin-Shell und die Staff-Mobile-App NICHT „Beautycenter"
 * als PWA-Home-Screen-App installieren, wenn man /m speichert.
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
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10">{children}</div>
    </div>
  );
}
