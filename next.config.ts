import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // มี package-lock.json อยู่ที่ home directory — ระบุ root ให้ชัดเจน
  turbopack: { root: __dirname },
  // ซ่อนปุ่ม "N" ของ Next.js ตอน dev (ไม่ให้บังจอฉาย) — error ยังแสดงตามปกติ
  devIndicators: false,
  // สำหรับ Docker image ขนาดเล็ก (รันด้วย node server.js)
  output: "standalone",
  // ให้เปิดหน้า dev ผ่าน IP ในวง LAN ได้ (เช่น เครื่องฉายเปิด http://172.25.x.x:3000)
  // ไม่ระบุ = Next.js บล็อกไฟล์ JS ของ dev → หน้าห้องสอบค้างที่ "กำลังเริ่มระบบ…" (มีผลเฉพาะ npm run dev)
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*"],
};

export default nextConfig;
