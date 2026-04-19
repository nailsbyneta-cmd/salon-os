import Link from 'next/link';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/calendar', label: 'Kalender' },
  { href: '/clients', label: 'Kunden' },
  { href: '/services', label: 'Services' },
  { href: '/staff', label: 'Team' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="border-r border-neutral-200 bg-neutral-50 p-6">
        <Link href="/" className="block text-lg font-semibold tracking-tight">
          SALON OS
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="overflow-auto">{children}</main>
    </div>
  );
}
