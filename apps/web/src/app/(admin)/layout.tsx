import { AdminShell } from '@/components/admin-shell';
import { brandStyle, loadTenantBranding } from '@/lib/tenant-brand';

/**
 * Admin-Layout mit data-product-theme Marker + Tenant-Brand-Override.
 * Der Marker schaltet Fonts/Farben auf Produkt-Look (Linear-Style),
 * die inline-style override die --brand-accent-Farbe tenant-spezifisch.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const { brandColor } = await loadTenantBranding();
  return (
    <div data-product-theme style={brandStyle(brandColor)}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
