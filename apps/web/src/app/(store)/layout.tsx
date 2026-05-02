import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div data-theme="dark" className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">{children}</div>
    </div>
  );
}
