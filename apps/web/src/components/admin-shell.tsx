'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, CommandPalette, type CommandItem, useTheme, Kbd, Avatar } from '@salon-os/ui';
import { ShortcutsHelp } from './shortcuts-help';
import { searchCommand } from '@/app/search-action';
import { getPendingCounts, type PendingCounts } from '@/app/pending-counts-action';
import { Celebrate } from '@/components/celebrate';
import { logoutAction } from '@/app/(public)/login/actions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <IconHome /> },
  { href: '/calendar', label: 'Kalender', icon: <IconCalendar /> },
  { href: '/waitlist', label: 'Warteliste', icon: <IconClock /> },
  { href: '/clients', label: 'Kunden', icon: <IconUsers /> },
  { href: '/services', label: 'Services', icon: <IconScissors /> },
  { href: '/staff', label: 'Team', icon: <IconTeam /> },
  { href: '/gift-cards', label: 'Gutscheine', icon: <IconGift /> },
  { href: '/inventory', label: 'Inventar', icon: <IconBox /> },
  { href: '/forms', label: 'Formulare', icon: <IconClipboard /> },
  { href: '/marketing', label: 'Marketing', icon: <IconMegaphone /> },
  { href: '/ads-dashboard', label: 'Ads-ROI', icon: <IconReports /> },
  { href: '/reports', label: 'Reports', icon: <IconReports /> },
  { href: '/audit', label: 'Audit-Log', icon: <IconShield /> },
  { href: '/settings', label: 'Einstellungen', icon: <IconGear /> },
];

export function AdminShell({
  children,
  tenantName = 'SALON OS',
}: {
  children: React.ReactNode;
  tenantName?: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle, resolved } = useTheme();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [counts, setCounts] = React.useState<PendingCounts | null>(null);
  const lastFetchRef = React.useRef<number>(0);

  React.useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Pending-Counts fetchen mit 60s-Throttle + Refetch bei Tab-Rückkehr.
  // Vorher: jede Route-Change triggerte 3 API-Calls — jetzt max 1x/min.
  React.useEffect(() => {
    let cancelled = false;
    const fetchCounts = (): void => {
      if (Date.now() - lastFetchRef.current < 60_000) return;
      lastFetchRef.current = Date.now();
      getPendingCounts()
        .then((res) => {
          if (!cancelled) setCounts(res);
        })
        .catch((e: unknown) => {
          console.warn('[admin-shell] pending-counts fetch failed:', e);
        });
    };
    fetchCounts();
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  const asyncLoader = React.useCallback(
    async (query: string): Promise<CommandItem[]> => {
      const hits = await searchCommand(query);
      const groupByKind: Record<(typeof hits)[number]['kind'], string> = {
        client: 'Kundinnen',
        appointment: 'Termine',
        staff: 'Team',
        service: 'Services',
      };
      const iconByKind = (kind: (typeof hits)[number]['kind'], label: string): React.ReactNode => {
        if (kind === 'client' || kind === 'staff') {
          return <Avatar name={label} size="sm" color="#007AFF" />;
        }
        if (kind === 'appointment') return <span>📅</span>;
        return <span>🛎️</span>;
      };
      return hits.map((hit) => ({
        id: hit.id,
        label: hit.label,
        hint: hit.hint,
        group: groupByKind[hit.kind],
        icon: iconByKind(hit.kind, hit.label),
        action: () => router.push(hit.href),
      }));
    },
    [router],
  );

  const items: CommandItem[] = React.useMemo(
    () => [
      ...nav.map((n) => ({
        id: `nav:${n.href}`,
        label: n.label,
        hint: n.href,
        group: 'Navigation',
        keywords: ['gehe zu', 'navigate'],
        action: () => router.push(n.href),
      })),
      {
        id: 'action:new-appointment',
        label: 'Neuer Termin',
        hint: '/calendar/new',
        group: 'Aktionen',
        keywords: ['termin', 'buchen', 'booking', 'appointment'],
        action: () => router.push('/calendar/new'),
      },
      {
        id: 'action:new-service',
        label: 'Neuer Service',
        hint: '/services/new',
        group: 'Aktionen',
        keywords: ['service', 'preis', 'catalog'],
        action: () => router.push('/services/new'),
      },
      {
        id: 'action:new-staff',
        label: 'Neue Mitarbeiterin',
        hint: '/staff/new',
        group: 'Aktionen',
        keywords: ['staff', 'team', 'mitarbeiter'],
        action: () => router.push('/staff/new'),
      },
      {
        id: 'action:toggle-theme',
        label: resolved === 'dark' ? 'Light-Mode aktivieren' : 'Dark-Mode aktivieren',
        group: 'Einstellungen',
        keywords: ['theme', 'dark', 'light', 'mode', 'design'],
        action: () => toggle(),
      },
      {
        id: 'action:open-booking',
        label: 'Öffentliche Booking-Seite',
        hint: '/book/beautycenter-by-neta',
        group: 'Links',
        keywords: ['public', 'kunden', 'booking'],
        action: () => router.push('/book/beautycenter-by-neta'),
      },
    ],
    [router, toggle, resolved],
  );

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#FAFAFA] text-[#171717] md:grid-cols-[220px_1fr]">
      {/* Mobile Top-Bar */}
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#007AFF] text-white text-[10px] font-bold tracking-tight">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-[#171717]">
              SALON OS
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Menü"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666666] hover:bg-[#F5F5F5] transition-colors"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            {navOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Backdrop */}
      {navOpen ? (
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Menü schliessen"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[220px] border-r border-[#E0E0E0] bg-white flex flex-col transition-transform duration-200',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="hidden items-center gap-2.5 px-5 pt-5 pb-4 md:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#007AFF] text-white text-xs font-bold tracking-tight">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-[#171717]">
              SALON OS
            </div>
            <div className="truncate text-[10px] text-[#999999] mt-0.5">{tenantName}</div>
          </div>
        </div>

        {/* Search / Command Palette trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mb-3 flex items-center justify-between gap-2 rounded-[6px] border border-[#E0E0E0] bg-[#FAFAFA] px-3 py-2 text-xs text-[#999999] hover:border-[#C7C7C7] hover:bg-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Suchen
          </span>
          <Kbd>⌘K</Kbd>
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            const badgeMeta: {
              count: number;
              tone: 'warning' | 'neutral';
              context: string;
            } =
              item.href === '/'
                ? {
                    count: counts?.toConfirmToday ?? 0,
                    tone: 'warning',
                    context: 'zu bestätigen',
                  }
                : item.href === '/inventory'
                  ? {
                      count: counts?.lowStock ?? 0,
                      tone: 'warning',
                      context: 'Produkte mit niedrigem Bestand',
                    }
                  : item.href === '/waitlist'
                    ? {
                        count: counts?.waitlist ?? 0,
                        tone: 'neutral',
                        context: 'wartend',
                      }
                    : { count: 0, tone: 'neutral', context: '' };
            const badgeCount = badgeMeta.count;
            const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors duration-150',
                  active
                    ? 'text-[#007AFF] font-medium bg-[#007AFF]/[0.06]'
                    : 'text-[#666666] hover:bg-[#F5F5F5] hover:text-[#171717]',
                )}
                aria-label={
                  badgeCount > 0 ? `${item.label} — ${badgeCount} ${badgeMeta.context}` : undefined
                }
              >
                {/* Active indicator — 2px left blue bar */}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#007AFF]"
                  />
                ) : null}
                <span
                  className={cn(
                    'shrink-0 transition-colors',
                    active ? 'text-[#007AFF]' : 'text-[#999999]',
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                <span
                  className={cn(
                    'inline-flex h-4.5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-opacity',
                    badgeCount > 0
                      ? badgeMeta.tone === 'warning'
                        ? 'bg-orange-100 text-orange-600 opacity-100'
                        : 'bg-[#F5F5F5] text-[#666666] opacity-100'
                      : 'opacity-0',
                  )}
                  aria-hidden="true"
                >
                  {badgeLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + logout */}
        <div className="border-t border-[#E0E0E0] p-3 space-y-0.5">
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between rounded-[6px] px-3 py-2 text-xs text-[#666666] hover:bg-[#F5F5F5] hover:text-[#171717] transition-colors"
            aria-label="Theme wechseln"
          >
            <span>{resolved === 'dark' ? 'Dunkel' : 'Hell'}</span>
            <span className="text-sm opacity-60">{resolved === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-[6px] px-3 py-2 text-xs text-[#666666] hover:bg-[#F5F5F5] hover:text-[#171717] transition-colors"
              aria-label="Abmelden"
            >
              <span>Abmelden</span>
              <span aria-hidden className="text-[#999999]">
                ↪
              </span>
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>

      <CommandPalette
        items={items}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        asyncItems={asyncLoader}
      />
      <ShortcutsHelp />
      <React.Suspense fallback={null}>
        <Celebrate />
      </React.Suspense>
    </div>
  );
}

// — Inline Icons (Lucide-style, kein Extra-Package) —

function IconHome(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCalendar(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  );
}

function IconUsers(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconScissors(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}

function IconTeam(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5 22a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconClock(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconGift(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M12 7v14M6 11.5c-1 0-2 -0.5-2-2s1-2 2-2c2 0 3 4 3 4h-3Zm12 0c1 0 2-0.5 2-2s-1-2-2-2c-2 0-3 4-3 4h3Z" />
    </svg>
  );
}

function IconBox(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 8V18a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 18V8" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconReports(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 4 4 6-6" />
    </svg>
  );
}

function IconMegaphone(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 11v3l13 5V6L3 11Z" />
      <path d="M16 8a4 4 0 0 1 0 6" />
      <path d="M7 14v3a2 2 0 0 0 4 0v-1.5" />
    </svg>
  );
}

function IconShield(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 4 5v7c0 5.25 3.5 9 8 10 4.5-1 8-4.75 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconClipboard(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function IconGear(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
