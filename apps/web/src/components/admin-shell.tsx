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
          return <Avatar name={label} size="sm" color="hsl(var(--brand-accent))" />;
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
    <div className="grid min-h-screen grid-cols-1 bg-background text-text-primary md:grid-cols-[240px_1fr]">
      {/* Mobile Top-Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-brand text-brand-foreground text-xs font-bold">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">SALON OS</div>
            <div className="truncate text-[9px] uppercase tracking-wider text-text-muted">
              {tenantName}
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Menü"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-raised"
        >
          <svg
            className="h-5 w-5"
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
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface flex flex-col transition-transform duration-200',
          'md:sticky md:top-0 md:h-screen md:w-auto md:translate-x-0 md:backdrop-blur-sm md:bg-surface/50',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden items-center gap-2 px-5 py-5 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent to-brand text-brand-foreground text-sm font-bold">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">SALON OS</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-text-muted">
              {tenantName}
            </div>
          </div>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mb-3 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Suchen
          </span>
          <Kbd>⌘K</Kbd>
        </button>

        <nav className="flex-1 px-2 py-2">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            // Badge-Count + kontextueller Label pro Nav-Item.
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
                  'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200',
                  active
                    ? 'bg-accent/10 font-medium text-text-primary shadow-sm'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
                )}
                aria-label={
                  badgeCount > 0 ? `${item.label} — ${badgeCount} ${badgeMeta.context}` : undefined
                }
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-accent"
                  />
                ) : null}
                <span className={cn('text-text-muted', active && 'text-accent')}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {/* Reserved-space placeholder verhindert CLS wenn counts
                    asynchron reinkommen. */}
                <span
                  className={cn(
                    'inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-opacity',
                    badgeCount > 0
                      ? badgeMeta.tone === 'warning'
                        ? 'bg-warning/20 text-warning opacity-100'
                        : 'bg-surface-raised text-text-secondary opacity-100'
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

        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised transition-colors"
            aria-label="Theme wechseln"
          >
            <span>{resolved === 'dark' ? 'Dunkel' : 'Hell'}</span>
            <span className="text-base">{resolved === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised transition-colors"
              aria-label="Abmelden"
            >
              <span>Abmelden</span>
              <span aria-hidden>↪</span>
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
