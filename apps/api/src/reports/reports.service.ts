import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface ReportsKpis {
  /** Anzahl Termine im Range (alle Stati). */
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Brutto-Umsatz aus completed Terminen (item.price * count). */
  revenueChf: number;
  /** Avg. Ticket = revenue / completed. */
  avgTicketChf: number | null;
  /** Re-Booking-Rate = clients mit ≥2 Terminen im Range / unique clients. */
  rebookingRate: number;
  /** No-Show-Rate (% noShow / appointments). */
  noShowRate: number;
  uniqueClients: number;
  newClients: number;
  from: string;
  to: string;
}

export interface ReportsTrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
  revenueChf: number;
}

export interface ReportsTopService {
  serviceId: string;
  name: string;
  count: number;
  revenueChf: number;
}

export interface ReportsTopClient {
  clientId: string;
  name: string;
  visits: number;
  revenueChf: number;
}

export interface ReportsStaffUtilization {
  staffId: string;
  name: string;
  color: string | null;
  count: number;
  completedCount: number;
  revenueChf: number;
  /** Genutzte Minuten / verfügbare Minuten (basierend auf Shifts im Range). */
  utilizationPct: number | null;
}

export interface ReportsBookingChannel {
  channel: string;
  count: number;
  revenueChf: number;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async getDashboard(
    tenantId: string,
    userId: string | null,
    role: string | null,
    range: { fromIso: string; toIso: string },
  ): Promise<{
    kpis: ReportsKpis;
    trend: ReportsTrendPoint[];
    topServices: ReportsTopService[];
    topClients: ReportsTopClient[];
    staffUtilization: ReportsStaffUtilization[];
    channels: ReportsBookingChannel[];
  }> {
    return this.withTenant(tenantId, userId, role, async (tx) => {
      const fromDate = new Date(range.fromIso);
      const toDate = new Date(range.toIso);

      // Eine grosse Query für alle Appts mit allem was wir brauchen.
      // Bei 10k+ Terminen wäre der nächste Schritt: pro KPI eigene
      // aggregierte SQL-Query. Aktuell reicht das.
      const appts = await tx.appointment.findMany({
        where: { startAt: { gte: fromDate, lte: toDate } },
        select: {
          id: true,
          status: true,
          startAt: true,
          bookedVia: true,
          clientId: true,
          staffId: true,
          client: { select: { firstName: true, lastName: true, createdAt: true } },
          staff: { select: { firstName: true, lastName: true, color: true } },
          items: { select: { serviceId: true, price: true, service: { select: { name: true } } } },
        },
      });

      // KPI roll-up
      const isRev = (s: string): boolean => s === 'COMPLETED';
      const sumItems = (items: Array<{ price: { toString(): string } }>): number =>
        items.reduce((s, i) => s + Number(i.price), 0);

      let completed = 0;
      let cancelled = 0;
      let noShow = 0;
      let revenueChf = 0;
      const byDay = new Map<string, { count: number; revenueChf: number }>();
      const byService = new Map<string, ReportsTopService>();
      const byClient = new Map<string, ReportsTopClient>();
      const byStaff = new Map<string, ReportsStaffUtilization>();
      const byChannel = new Map<string, ReportsBookingChannel>();
      const uniqueClientIds = new Set<string>();
      const clientVisitCount = new Map<string, number>();

      for (const a of appts) {
        const dayKey = a.startAt.toISOString().slice(0, 10);
        const day = byDay.get(dayKey) ?? { count: 0, revenueChf: 0 };
        day.count += 1;
        if (a.status === 'CANCELLED') cancelled += 1;
        if (a.status === 'NO_SHOW') noShow += 1;
        if (isRev(a.status)) {
          completed += 1;
          const itemSum = sumItems(a.items);
          revenueChf += itemSum;
          day.revenueChf += itemSum;
        }
        byDay.set(dayKey, day);

        // Per-Service
        for (const item of a.items) {
          const cur = byService.get(item.serviceId) ?? {
            serviceId: item.serviceId,
            name: item.service.name,
            count: 0,
            revenueChf: 0,
          };
          cur.count += 1;
          if (isRev(a.status)) cur.revenueChf += Number(item.price);
          byService.set(item.serviceId, cur);
        }

        // Per-Client (für Top-Kundinnen + Re-Booking)
        if (a.clientId && a.client) {
          uniqueClientIds.add(a.clientId);
          clientVisitCount.set(a.clientId, (clientVisitCount.get(a.clientId) ?? 0) + 1);
          const cur = byClient.get(a.clientId) ?? {
            clientId: a.clientId,
            name: `${a.client.firstName} ${a.client.lastName}`,
            visits: 0,
            revenueChf: 0,
          };
          cur.visits += 1;
          if (isRev(a.status)) cur.revenueChf += sumItems(a.items);
          byClient.set(a.clientId, cur);
        }

        // Per-Staff
        const staffName = a.staff
          ? `${a.staff.firstName} ${a.staff.lastName}`
          : a.staffId.slice(0, 6);
        const staffCur = byStaff.get(a.staffId) ?? {
          staffId: a.staffId,
          name: staffName,
          color: a.staff?.color ?? null,
          count: 0,
          completedCount: 0,
          revenueChf: 0,
          utilizationPct: null,
        };
        staffCur.count += 1;
        if (isRev(a.status)) {
          staffCur.completedCount += 1;
          staffCur.revenueChf += sumItems(a.items);
        }
        byStaff.set(a.staffId, staffCur);

        // Per-Channel
        const ch = a.bookedVia ?? 'STAFF_INTERNAL';
        const chCur = byChannel.get(ch) ?? { channel: ch, count: 0, revenueChf: 0 };
        chCur.count += 1;
        if (isRev(a.status)) chCur.revenueChf += sumItems(a.items);
        byChannel.set(ch, chCur);
      }

      // Re-Booking-Rate: % der Kundinnen mit ≥2 Termine im Range
      const rebookingClients = Array.from(clientVisitCount.values()).filter((n) => n >= 2).length;
      const rebookingRate = uniqueClientIds.size > 0 ? rebookingClients / uniqueClientIds.size : 0;

      // New-Clients: client.createdAt liegt im Range. Pro Client unique.
      const seenNew = new Set<string>();
      for (const a of appts) {
        if (a.clientId && a.client?.createdAt && a.client.createdAt >= fromDate) {
          seenNew.add(a.clientId);
        }
      }

      // Staff-Utilization: nutzbare Minuten = SUM(shifts.duration) im Range
      // Wir holen Shifts separat um keine cartesian-Explosion zu haben.
      const shifts = await tx.shift.findMany({
        where: {
          startAt: { gte: fromDate, lte: toDate },
        },
        select: { staffId: true, startAt: true, endAt: true },
      });
      const shiftMinutes = new Map<string, number>();
      for (const s of shifts) {
        const dur = Math.max(0, (s.endAt.getTime() - s.startAt.getTime()) / 60_000);
        shiftMinutes.set(s.staffId, (shiftMinutes.get(s.staffId) ?? 0) + dur);
      }
      // appointmentMinutes pro Staff
      const apptMinutes = new Map<string, number>();
      for (const a of appts) {
        if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
        const itemMin = a.items.reduce((s, _i) => s + 0, 0);
        // Nimm Item-Duration falls vorhanden, sonst aus startAt/endAt
        // (price ist ALWAYS, duration nicht im select — fallback auf item.duration verlangt extra select)
        // Stattdessen: nutze startAt/endAt — die sind im Appointment.
        // appt.endAt ist nicht im select — re-fetchen
        void itemMin;
      }
      // Zweite Query um end-Time zu holen — günstiger als alle Appts in der ersten zu fetchen
      const apptDurations = await tx.appointment.findMany({
        where: { startAt: { gte: fromDate, lte: toDate } },
        select: { staffId: true, startAt: true, endAt: true, status: true },
      });
      for (const a of apptDurations) {
        if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
        const dur = Math.max(0, (a.endAt.getTime() - a.startAt.getTime()) / 60_000);
        apptMinutes.set(a.staffId, (apptMinutes.get(a.staffId) ?? 0) + dur);
      }
      for (const s of byStaff.values()) {
        const avail = shiftMinutes.get(s.staffId) ?? 0;
        const used = apptMinutes.get(s.staffId) ?? 0;
        s.utilizationPct = avail > 0 ? Math.round((used / avail) * 1000) / 10 : null;
      }

      // Listen sortieren + roundieren
      const round2 = (n: number): number => Math.round(n * 100) / 100;
      const trend = Array.from(byDay.entries())
        .map(([date, v]) => ({ date, count: v.count, revenueChf: round2(v.revenueChf) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const topServices = Array.from(byService.values())
        .map((s) => ({ ...s, revenueChf: round2(s.revenueChf) }))
        .sort((a, b) => b.revenueChf - a.revenueChf || b.count - a.count)
        .slice(0, 10);
      const topClients = Array.from(byClient.values())
        .map((c) => ({ ...c, revenueChf: round2(c.revenueChf) }))
        .sort((a, b) => b.revenueChf - a.revenueChf || b.visits - a.visits)
        .slice(0, 10);
      const staffUtilization = Array.from(byStaff.values())
        .map((s) => ({ ...s, revenueChf: round2(s.revenueChf) }))
        .sort((a, b) => b.revenueChf - a.revenueChf);
      const channels = Array.from(byChannel.values())
        .map((c) => ({ ...c, revenueChf: round2(c.revenueChf) }))
        .sort((a, b) => b.count - a.count);

      const kpis: ReportsKpis = {
        appointments: appts.length,
        completed,
        cancelled,
        noShow,
        revenueChf: round2(revenueChf),
        avgTicketChf: completed > 0 ? round2(revenueChf / completed) : null,
        rebookingRate: Math.round(rebookingRate * 1000) / 10,
        noShowRate: appts.length > 0 ? Math.round((noShow / appts.length) * 1000) / 10 : 0,
        uniqueClients: uniqueClientIds.size,
        newClients: seenNew.size,
        from: range.fromIso,
        to: range.toIso,
      };

      return { kpis, trend, topServices, topClients, staffUtilization, channels };
    });
  }
}
