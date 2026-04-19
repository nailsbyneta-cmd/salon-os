/**
 * Public-Booking-Layout. Kein Admin-Sidebar, kein Auth.
 */
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
