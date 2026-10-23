import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ] },
      { source: '/uploads/:path*', headers: [
        { key: 'Content-Security-Policy', value: "sandbox; default-src 'none'; style-src 'unsafe-inline'" },
      ] },
      { source: '/api/admin/:path*', headers: [
        { key: 'Cache-Control', value: 'no-store' },
      ] },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
