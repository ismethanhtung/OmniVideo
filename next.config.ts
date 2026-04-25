import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: isDev ? ".next-dev" : ".next",
};

export default nextConfig;
