import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // only our own assets and uploaded menu photos may go through the optimiser
    localPatterns: [
      { pathname: "/brand/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
  },
  experimental: {
    serverActions: {
      // menu photos from a phone camera; they are shrunk to WebP on the server
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
