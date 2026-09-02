import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  transpilePackages: ['@sourcewiki/shared'],
  async rewrites() {
    const target =
      process.env.API_PROXY_TARGET ??
      (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : undefined);

    if (!target) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
