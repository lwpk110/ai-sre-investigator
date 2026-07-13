import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开发环境代理 API 请求到 FastAPI 后端
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
