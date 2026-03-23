import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  env: {
    NEXT_PUBLIC_GATEWAY_URL:
      process.env["NEXT_PUBLIC_GATEWAY_URL"] ?? "http://localhost:8000",
    NEXT_PUBLIC_WS_URL:
      process.env["NEXT_PUBLIC_WS_URL"] ?? "ws://localhost:8000",
    NEXT_PUBLIC_APP_VERSION: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "0.1.0",
    NEXT_PUBLIC_ENVIRONMENT:
      process.env["NEXT_PUBLIC_ENVIRONMENT"] ?? "development",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
