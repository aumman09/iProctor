import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // มี package-lock.json อยู่ที่ home directory — ระบุ root ให้ชัดเจน
  turbopack: { root: __dirname },
};

export default nextConfig;
