import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Railway provides $PORT; Next.js reads it automatically via next start -p $PORT
  experimental: {
    // This Next build buffers the request body (default 10MB) which silently
    // truncated audio uploads → FormData parse threw a bare 500. Raise it so the
    // server relay handles clips and normal-length episodes. Very large WAV
    // episodes (>100MB) still want the direct-to-R2 path (bucket CORS).
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
