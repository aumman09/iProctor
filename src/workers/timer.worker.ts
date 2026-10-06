/// <reference lib="webworker" />

// Drift-free ticker: ตั้งเวลาให้ตรงขอบวินาทีทุกครั้ง (ไม่สะสม drift แบบ setInterval)
// และทำงานใน Worker จึงไม่ถูก throttle เมื่อแท็บอยู่เบื้องหลัง

type Msg = { type: "start"; intervalMs?: number } | { type: "stop" };

let timer: ReturnType<typeof setTimeout> | null = null;
let interval = 1000;

function schedule() {
  const now = Date.now();
  const delay = interval - (now % interval) + 2;
  timer = setTimeout(() => {
    postMessage(Date.now());
    schedule();
  }, delay);
}

self.onmessage = (e: MessageEvent<Msg>) => {
  if (timer) clearTimeout(timer);
  timer = null;
  if (e.data.type === "start") {
    interval = e.data.intervalMs ?? 1000;
    postMessage(Date.now());
    schedule();
  }
};
