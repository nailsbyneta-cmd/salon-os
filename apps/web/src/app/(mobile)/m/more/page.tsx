import Link from 'next/link';
import { ThemeToggleRow } from './theme-toggle-row';

const sections = [
  {
    title: 'Kundinnen',
    items: [
      { href: '/clients', label: 'Alle Kundinnen', emoji: '👥' },
      { href: '/waitlist', label: 'Warteliste', emoji: '⏳' },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/services', label: 'Services', emoji: '✂️' },
      { href: '/forms', label: 'Formulare', emoji: '📋' },
      { href: '/gift-cards', label: 'Gutscheine', emoji: '🎁' },
      { href: '/inventory', label: 'Inventar', emoji: '📦' },
    ],
  },
  {
    title: 'Team',
    items: [{ href: '/staff', label: 'Mitarbeiterinnen', emoji: '💁' }],
  },
  {
    title: 'Auswertung',
    items: [{ href: '/reports', label: 'Reports', emoji: '📊' }],
  },
  {
    title: 'Kundenseite',
    items: [
      {
        href: '/book/beautycenter-by-neta',
        label: 'Online-Booking',
        emoji: '🔗',
      },
    ],
  },
];

export default function MorePage(): React.JSX.Element {
  return (
    <div>
      <header className="px-5 pt-8 pb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted">Mehr</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Beautycenter by Neta
        </h1>
      </header>

      <div className="space-y-6 px-5 pb-5">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {section.title}
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {section.items.map((item, idx) => (
                <li key={item.href} className={idx > 0 ? 'border-t border-border' : ''}>
                  <Link
                    href={item.href as never}
                    className="flex items-center gap-3 px-4 py-3 active:bg-surface-raised transition-colors"
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <span className="text-text-muted">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            App
          </h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            <ThemeToggleRow />
          </ul>
        </section>
      </div>
    </div>
  );
}
