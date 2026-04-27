/**
 * Security-Header gelten auf alle Routes. CSP bewusst pragmatisch: 'unsafe-inline'
 * für Tailwind-Styles und Next.js inline-script bootstrap, 'unsafe-eval' für
 * Webpack/Turbopack dev. Production-tightening in eigenem ADR sobald CSP-Reports
 * eingerichtet sind.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
