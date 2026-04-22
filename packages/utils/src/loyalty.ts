/**
 * Loyalty-Regelwerk (MVP).
 * - 1 Punkt pro 1 CHF Umsatz (non-refunded, non-no-show).
 * - Tiers basierend auf kumuliertem Umsatz (Lifetime).
 *   Die Werte sind sinnvolle Defaults, Tenants werden später in Phase 2
 *   ihre eigenen via Admin-Settings überschreiben.
 */

export type LoyaltyTier = 'BRONZE' | 'SILBER' | 'GOLD' | 'PLATIN';

interface TierSpec {
  id: LoyaltyTier;
  label: string;
  minSpent: number;
  benefitHint: string;
}

export const TIERS: readonly TierSpec[] = [
  { id: 'BRONZE', label: 'Bronze', minSpent: 0, benefitHint: '1 Punkt pro CHF' },
  {
    id: 'SILBER',
    label: 'Silber',
    minSpent: 500,
    benefitHint: '5 % Stammkunden-Rabatt',
  },
  {
    id: 'GOLD',
    label: 'Gold',
    minSpent: 2_000,
    benefitHint: '10 % Rabatt + Geburtstags-Gutschein',
  },
  {
    id: 'PLATIN',
    label: 'Platin',
    minSpent: 5_000,
    benefitHint: '15 % Rabatt + VIP-Zeitfenster',
  },
] as const;

export interface LoyaltyStatus {
  tier: TierSpec;
  nextTier: TierSpec | null;
  /** Punkte = 1 per CHF (gerundet). */
  points: number;
  /** Wieviel CHF bis zum nächsten Tier. Null wenn bereits max. */
  toNextCHF: number | null;
  /** Fortschritt 0-1 im aktuellen Tier. */
  progressInTier: number;
}

export function computeLoyalty(totalSpentCHF: number): LoyaltyStatus {
  const tier = [...TIERS].reverse().find((t) => totalSpentCHF >= t.minSpent) ?? TIERS[0]!;
  const nextTier = TIERS.find((t) => t.minSpent > tier.minSpent) ?? null;
  const toNextCHF = nextTier ? Math.max(0, nextTier.minSpent - totalSpentCHF) : null;
  const tierRange = nextTier ? nextTier.minSpent - tier.minSpent : 1;
  const progressInTier = nextTier ? Math.min(1, (totalSpentCHF - tier.minSpent) / tierRange) : 1;
  return {
    tier,
    nextTier,
    points: Math.floor(totalSpentCHF),
    toNextCHF,
    progressInTier,
  };
}
