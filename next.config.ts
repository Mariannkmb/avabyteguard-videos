import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/ai-readiness", destination: "/ai-readiness/index.html" },
    ];
  },
};

export default nextConfig;
