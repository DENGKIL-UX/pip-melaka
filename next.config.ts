import type { NextConfig } from "next";

const config: NextConfig = {
  // ponytail: MLK — images unoptimized (Workers can't optimise images).
  images: { unoptimized: true },
  // ponytail: MLK — NO output: 'standalone' (OpenNext handles bundling).
  // NO /api/engine route exists (engine is build-time only).
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default config;
