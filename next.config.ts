import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/streetlight',
  trailingSlash: true,
};

export default nextConfig;
