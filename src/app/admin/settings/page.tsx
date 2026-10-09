import { TimingForm } from "@/components/admin/TimingForm";
import { PageHeader } from "@/components/admin/ui";
import { getAlertTiming } from "@/lib/server/settings";

export default async function AdminSettings() {
  const timing = await getAlertTiming();
  return (
    <>
      <PageHeader
        title="เวลาแจ้งเตือน"
        sub="ใช้กับหน้าจอคุมสอบทุกห้อง — หน้าจอที่เปิดอยู่แล้วจะใช้ค่าใหม่เมื่อโหลดหน้าใหม่"
      />
      <TimingForm initial={timing} />
    </>
  );
}
