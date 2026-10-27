import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep pages the user has just visited for 30s, so switching back and forth (e.g. the student
    // portal's dock tabs) is instant instead of re-rendering on the server every time
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      {
        // photos and logos: browsers keep them for a day and refresh quietly in the background after
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }],
      },
      {
        // the service worker itself must always be revalidated so updates roll out
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
