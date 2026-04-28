import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface AdsDashboardKpis {
  spendChf: number;
  bookingRevenueChf: number;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  /** Range: ISO start/end (inclusive). */
  from: string;
  to: string;
}

export interface AdsDashboardCampaign {
  campaignId: string | null;
  campaignName: string | null;
  spendChf: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpa: number | null;
  roas: number | null;
}

export interface AdsDashboardSourceMix {
  source: string;
  bookings: number;
  revenueChf: number;
}

export interface AdsDashboardTrendPoint {
  date: string; // YYYY-MM-DD
  spendChf: number;
  revenueChf: number;
}

@Injectable()
export class AdsDashboardService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  /**
   * Liefert KPI-Header + Per-Campaign + Source-Mix + Trend-Series für
   * einen Zeitraum (default: letzte 30 Tage). Tenant-isolation via withTenant.
   */
  async getDashboard(
    tenantId: string,
    userId: string | null,
    role: string | null,
    range: { fromIso: string; toIso: string },
  ): Promise<{
    kpis: AdsDashboardKpis;
    campaigns: AdsDashboardCampaign[];
    sourceMix: AdsDashboardSourceMix[];
    trend: AdsDashboardTrendPoint[];
  }> {
    return this.withTenant(tenantId, userId, role, async (tx) => {
      const fromDate = new Date(range.fromIso);
      const toDate = new Date(range.toIso);
      // Spend aggregation per campaign + total
      const spendRows = await tx.tenantAdsSpendDaily.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: {
          date: true,
          campaignId: true,
          campaignName: true,
          clicks: true,
          impressions: true,
          costChf: true,
          conversions: true,
          conversionValueChf: true,
        },
      });

      // Booking-Revenue aus Appointments (attributed → google_ads + non-cancelled).
      // Wir summieren item.price im Range, gefiltert nach attributionSource.
      const bookings = await tx.appointment.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: {
          attributionSource: true,
          items: { select: { price: true } },
        },
      });

      const bookingRevenue = bookings
        .filter((b) => b.attributionSource === 'google_ads')
        .reduce((sum, b) => sum + b.items.reduce((s, i) => s + Number(i.price), 0), 0);
      const adsConversions = bookings.filter((b) => b.attributionSource === 'google_ads').length;

      const totalSpend = spendRows.reduce((sum, r) => sum + Number(r.costChf), 0);
      const totalClicks = spendRows.reduce((sum, r) => sum + r.clicks, 0);
      const totalImpressions = spendRows.reduce((sum, r) => sum + r.impressions, 0);

      // Per-Campaign roll-up
      const byCampaign = new Map<string, AdsDashboardCampaign>();
      for (const r of spendRows) {
        const key = r.campaignId ?? '_total';
        const cur = byCampaign.get(key) ?? {
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          spendChf: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          cpa: null,
          roas: null,
        };
        cur.spendChf += Number(r.costChf);
        cur.clicks += r.clicks;
        cur.impressions += r.impressions;
        cur.conversions += Number(r.conversions);
        byCampaign.set(key, cur);
      }
      const campaigns = Array.from(byCampaign.values()).map((c) => ({
        ...c,
        spendChf: Math.round(c.spendChf * 100) / 100,
        cpa: c.conversions > 0 ? Math.round((c.spendChf / c.conversions) * 100) / 100 : null,
        roas: null, // per-campaign roas würde Booking-Attribution mit campaignId koppeln (Phase 2)
      }));
      campaigns.sort((a, b) => b.spendChf - a.spendChf);

      // Source-Mix donut
      const mix = new Map<string, AdsDashboardSourceMix>();
      for (const b of bookings) {
        const src = b.attributionSource ?? 'unknown';
        const rev = b.items.reduce((s, i) => s + Number(i.price), 0);
        const cur = mix.get(src) ?? { source: src, bookings: 0, revenueChf: 0 };
        cur.bookings += 1;
        cur.revenueChf += rev;
        mix.set(src, cur);
      }
      const sourceMix = Array.from(mix.values()).map((s) => ({
        ...s,
        revenueChf: Math.round(s.revenueChf * 100) / 100,
      }));
      sourceMix.sort((a, b) => b.bookings - a.bookings);

      // Trend per day (spend total + ads-attributed revenue total)
      const byDate = new Map<string, AdsDashboardTrendPoint>();
      for (const r of spendRows) {
        const k = r.date.toISOString().slice(0, 10);
        const cur = byDate.get(k) ?? { date: k, spendChf: 0, revenueChf: 0 };
        cur.spendChf += Number(r.costChf);
        byDate.set(k, cur);
      }
      // Revenue per Tag aus Bookings — wir holen createdAt für die Zuordnung.
      const bookingsWithDate = await tx.appointment.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          attributionSource: 'google_ads',
        },
        select: { createdAt: true, items: { select: { price: true } } },
      });
      for (const b of bookingsWithDate) {
        const k = b.createdAt.toISOString().slice(0, 10);
        const cur = byDate.get(k) ?? { date: k, spendChf: 0, revenueChf: 0 };
        cur.revenueChf += b.items.reduce((s, i) => s + Number(i.price), 0);
        byDate.set(k, cur);
      }
      const trend = Array.from(byDate.values())
        .map((p) => ({
          ...p,
          spendChf: Math.round(p.spendChf * 100) / 100,
          revenueChf: Math.round(p.revenueChf * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const kpis: AdsDashboardKpis = {
        spendChf: Math.round(totalSpend * 100) / 100,
        bookingRevenueChf: Math.round(bookingRevenue * 100) / 100,
        conversions: adsConversions,
        cpa: adsConversions > 0 ? Math.round((totalSpend / adsConversions) * 100) / 100 : null,
        roas: totalSpend > 0 ? Math.round((bookingRevenue / totalSpend) * 100) / 100 : null,
        from: range.fromIso,
        to: range.toIso,
      };

      // touch totals so they're available for future "channel-level"
      // breakdowns; suppress unused-var lint
      void totalClicks;
      void totalImpressions;

      return { kpis, campaigns, sourceMix, trend };
    });
  }
}
