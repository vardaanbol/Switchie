import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse + @napi-rs/canvas must stay external so Node can load the
  // native canvas polyfills (DOMMatrix etc.) on Vercel serverless.
  serverExternalPackages: ["mongoose", "pdf-parse", "@napi-rs/canvas", "mammoth"],
};

export default nextConfig;
