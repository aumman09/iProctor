// เก็บไฟล์เสียงคำชี้แจงที่อัปโหลดเอง (FR-04.1) ไว้ใน IndexedDB ของเครื่องฉาย แยกตามห้อง
// TODO: เมื่อมี backend สำหรับอัปโหลด ให้เปลี่ยนไปใช้ customAudioUrl จาก ProctorDuty

const DB = "iproctor-audio";
const STORE = "custom-start";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredAudio {
  name: string;
  data: ArrayBuffer;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const loadCustomAudio = (roomId: string) =>
  run<StoredAudio | undefined>("readonly", (s) => s.get(roomId)).catch(() => undefined);
export const saveCustomAudio = (roomId: string, audio: StoredAudio) => run("readwrite", (s) => s.put(audio, roomId));
export const deleteCustomAudio = (roomId: string) => run("readwrite", (s) => s.delete(roomId));
