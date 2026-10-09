/** footer ของหน้าเว็บทั่วไป (login / portal / ผังที่นั่ง) — ไม่ใช้กับหน้าจอฉายในห้องสอบ */
export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-1 px-4 py-6 text-center text-xs text-slate-400 sm:flex-row sm:px-6 sm:text-left">
      <p>© 2026 Centre for Digital Technology and Information, Mae Fah Luang University</p>
      <p>Developed by the iProctor Team · Inspired by School of Science, MFU</p>
    </footer>
  );
}
