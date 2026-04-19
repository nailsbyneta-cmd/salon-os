/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@salon-os/ui', '@salon-os/utils', '@salon-os/types', '@salon-os/auth'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
