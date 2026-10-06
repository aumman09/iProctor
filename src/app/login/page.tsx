import Link from "next/link";

// TODO: เชื่อม MFU SSO (OAuth2 / OIDC) — ปุ่มนี้ควรพาไป authorization endpoint ของ มฟล.
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-md">
          iP
        </div>
        <h1 className="text-xl font-bold text-slate-950">
          iProctor <span className="text-rose-600 font-extrabold">MFU</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">ระบบผู้ช่วยคุมสอบ มหาวิทยาลัยแม่ฟ้าหลวง</p>
        <Link
          href="/"
          className="mt-8 block w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-2xl transition shadow-md"
        >
          เข้าสู่ระบบด้วย MFU SSO
        </Link>
        <p className="text-[11px] text-slate-400 mt-3">(ยังเป็นโหมดทดสอบ — ยังไม่ได้เชื่อม SSO จริง)</p>
      </div>
    </main>
  );
}
