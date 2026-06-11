import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Cloudflare Tunnel 経由のスマホアクセス用（開発モード）
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
