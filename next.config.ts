import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // มี package-lock.json อยู่ที่ home directory — ระบุ root ให้ชัดเจน
  turbopack: { root: __dirname },
  // ซ่อนปุ่ม "N" ของ Next.js ตอน dev (ไม่ให้บังจอฉาย) — error ยังแสดงตามปกติ
  devIndicators: false,
  // สำหรับ Docker image ขนาดเล็ก (รันด้วย node server.js)
  output: "standalone",
};

export default nextConfig;
