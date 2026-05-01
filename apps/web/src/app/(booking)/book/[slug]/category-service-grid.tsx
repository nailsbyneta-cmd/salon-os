'use client';
import * as React from 'react';
import { ServiceCardToggle } from './service-card-toggle';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
}

interface CategoryGroup {
  catId: string;
  catName: string;
  items: ServiceItem[];
}

interface Props {
  slug: string;
  locationId: string;
  groups: CategoryGroup[];
}

export function CategoryServiceGrid({ slug, locationId, groups }: Props): React.JSX.Element {
  const [active, setActive] = React.useState(groups[0]?.catId ?? '');
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const currentGroup = groups.find((g) => g.catId === active) ?? groups[0];

  // Scroll active tab into view on switch
  const handleTab = (id: string): void => {
    setActive(id);
    const btn = tabsRef.current?.querySelector<HTMLButtonElement>(`[data-catid="${id}"]`);
    btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  if (groups.length === 0) return <></>;

  return (
    <div className="space-y-4">
      {/* Sticky category tab bar */}
      <div
        className="sticky top-0 z-20 -mx-4 overflow-hidden bg-background/90 backdrop-blur-md md:mx-0 md:rounded-xl"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div
          ref={tabsRef}
          className="flex gap-1.5 overflow-x-auto px-4 py-2.5 md:px-0 md:py-3"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {groups.map((g) => {
            const isActive = g.catId === active;
            return (
              <button
                key={g.catId}
                data-catid={g.catId}
                type="button"
                onClick={() => handleTab(g.catId)}
                className={[
                  'flex-none rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 whitespace-nowrap',
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-surface/80 text-text-secondary hover:bg-surface hover:text-text-primary border border-border',
                ].join(' ')}
              >
                {g.catName}
                <span
                  className={[
                    'ml-1.5 text-[11px] tabular-nums',
                    isActive ? 'opacity-70' : 'opacity-50',
                  ].join(' ')}
                >
                  {g.items.length}
                </span>
              </button>
            );
          })}
        </div>
        {/* Bottom border line */}
        <div className="h-px bg-border/60" />
      </div>

      {/* Service list for active category */}
      {currentGroup ? (
        <div className="grid gap-2.5" key={currentGroup.catId}>
          {currentGroup.items.map((s, i) => (
            <ServiceCardToggle
              key={s.id}
              slug={slug}
              serviceId={s.id}
              serviceName={s.name}
              basePrice={s.basePrice}
              durationMinutes={s.durationMinutes}
              configureHref={`/book/${slug}/service/${s.id}/configure?location=${locationId}`}
            >
              <ServiceCardBody
                name={s.name}
                description={s.description}
                durationMinutes={s.durationMinutes}
                basePrice={s.basePrice}
                index={i}
              />
            </ServiceCardToggle>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ServiceCardBody({
  name,
  description,
  durationMinutes,
  basePrice,
  index,
}: {
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
  index: number;
}): React.JSX.Element {
  return (
    <div
      className="relative flex items-center justify-between gap-4 px-4 py-4 pr-14"
      style={{
        animationDelay: `${index * 40}ms`,
        animation: 'cardSlideIn 240ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Left: name + meta */}
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-semibold tracking-tight text-text-primary md:text-base">
          {name}
        </div>
        {description ? (
          <div className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
            {description}
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] tabular-nums text-text-muted">
            <svg
              aria-hidden
              className="h-3 w-3 opacity-60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {durationMinutes} Min
          </span>
        </div>
      </div>

      {/* Right: price */}
      <div className="flex-none text-right">
        <div className="font-display text-xl font-semibold tabular-nums text-text-primary">
          <span className="mr-0.5 text-[10px] font-medium tracking-wider text-text-muted">
            CHF
          </span>
          {Number(basePrice).toFixed(0)}
        </div>
      </div>

      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
