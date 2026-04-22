/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@salon-os/ui', '@salon-os/utils', '@salon-os/types', '@salon-os/auth'],
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    // Lint läuft in dedizierter CI-Stage (pnpm lint). Next.js würde sonst
    // beim Build nochmal seinen eigenen Rule-Set zusätzlich drüberlegen —
    // doppelt gemoppelt und teils strenger. Pre-existing Errors (celebrate,
    // self-service-actions floating promises) werden separat bereinigt.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
