import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  transpilePackages: ["@powervideo/shared"],
  async rewrites() {
    // Local/dev: proxy /api → FastAPI. On Vercel, set API_ORIGIN to a public API host.
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
