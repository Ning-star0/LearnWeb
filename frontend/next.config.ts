import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 请求体大小限制
  serverExternalPackages: [],
  // 开发环境代理到后端
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
