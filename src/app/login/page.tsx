import { mockLogin } from "./actions";

// TODO: เชื่อม MFU SSO (OAuth2 / OIDC) — ปุ่ม SSO ควรพาไป authorization endpoint ของ มฟล.
// ตอนนี้มีเฉพาะ Mock Login (FR-01.2)
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

        <button
          disabled
          className="mt-8 block w-full py-3 bg-slate-200 text-slate-400 font-semibold rounded-2xl cursor-not-allowed"
        >
          เข้าสู่ระบบด้วย MFU SSO (เร็ว ๆ นี้)
        </button>

        <form action={mockLogin} className="mt-4 space-y-2">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Mock Login (โหมดพัฒนา)</p>
          <button name="role" value="proctor" className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-2xl transition shadow-md">
            เข้าเป็นอาจารย์ผู้คุมสอบ
          </button>
          <button name="role" value="admin" className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-2xl transition">
            เข้าเป็น Admin กลาง
          </button>
        </form>
      </div>
    </main>
  );
}
