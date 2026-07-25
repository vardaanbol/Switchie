import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "pdf-parse", "mammoth"],
};

export default nextConfig;
