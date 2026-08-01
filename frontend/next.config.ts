import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
