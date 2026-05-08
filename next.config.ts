import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: Railway copies only what's needed into the container
  output: "standalone",

  // External packages that should not be bundled for server components
  serverExternalPackages: ["pdf-parse", "tesseract.js"],

  // Allow Railway's domain and any custom domain
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
