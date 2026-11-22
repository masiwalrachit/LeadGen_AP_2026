import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep the dev-only Next.js badge away from the sidebar's sign-out button.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
