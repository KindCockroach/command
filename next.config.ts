import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Railway provides $PORT; Next.js reads it automatically via next start -p $PORT
};

export default nextConfig;
