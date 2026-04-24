/**
 * Tenant-Brand-Accent loader + HSL converter.
 *
 * Ein Tenant kann via `Tenant.brandColor` (HEX, z.B. "#C8A96E") die
 * Produkt-Akzentfarbe überschreiben. Wir konvertieren HEX → HSL und
 * liefern einen CSSProperties-Style der direkt auf einen Wrapper-Div
 * angewendet wird — ohne extra Roundtrip, ohne Paint-Flash.
 */
import { apiFetch, ApiError } from './api';
import { getCurrentTenant } from './tenant';

interface TenantInfo {
  name: string;
  brandColor: string | null;
}

export async function loadTenantBranding(): Promise<{
  name: string | null;
  brandColor: string | null;
}> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<TenantInfo>('/v1/salon/tenant', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return { name: res.name, brandColor: res.brandColor };
  } catch (err) {
    if (err instanceof ApiError) return { name: null, brandColor: null };
    throw err;
  }
}

function hexToHsl(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lig = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(lig * 100)}%`;
}

/**
 * Liefert einen Style-Objekt mit --brand-accent / --brand-accent-foreground
 * Override, wenn Tenant eine Brand-Color gesetzt hat.
 */
export function brandStyle(brandColor: string | null): React.CSSProperties {
  if (!brandColor) return {};
  const hsl = hexToHsl(brandColor);
  if (!hsl) return {};
  return {
    ['--brand-accent' as string]: hsl,
    ['--ring' as string]: hsl,
  };
}
