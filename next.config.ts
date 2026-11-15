import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Excalidraw scenes can grow large once images and diagrams are added.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
