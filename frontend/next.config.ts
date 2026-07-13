import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出（用于 Docker 部署）
  output: "standalone",
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
