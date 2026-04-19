/**
 * Public-Booking-Layout. Kein Admin-Sidebar, kein Auth.
 * Genutzt unter `/book/[slug]/...`. Minimalistisch, Mobile-First.
 */
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-4 py-10">{children}</div>
    </div>
  );
}
