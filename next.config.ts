import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    agentUpgrade: "security",
    serverActions: {
      // Excalidraw scenes can grow large once images and diagrams are added.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
