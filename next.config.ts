import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/mstr-vs-btc" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
