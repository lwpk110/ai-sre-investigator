import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出（用于 Docker 部署）
  output: "standalone",
  // 代理 API 请求到 FastAPI 后端
  // 开发环境: localhost:8000；Docker: 通过 BACKEND_URL 环境变量指定
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
