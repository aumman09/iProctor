"use client";

// Web Audio Engine
// - ต้อง unlock() จากการคลิกของผู้ใช้ครั้งแรก (browser autoplay policy)
// - เล่นเสียงตามคิวทีละรายการ ไม่ซ้อนกัน
// - ถ้าไม่พบไฟล์เสียงใน public/audio/ จะเล่น chime สังเคราะห์แทน

import { AUDIO_CUES, type AudioCue } from "./config";
import { deleteCustomAudio, loadCustomAudio, saveCustomAudio } from "./custom-audio-store";

type Note = { freq: number; dur: number; delay: number };

const FALLBACK_CHIMES: Record<AudioCue, Note[]> = {
  welcome: [
    { freq: 523.25, dur: 0.4, delay: 0 },
    { freq: 659.25, dur: 0.4, delay: 0.25 },
    { freq: 783.99, dur: 0.7, delay: 0.5 },
  ],
  rules: [
    { freq: 783.99, dur: 0.4, delay: 0 },
    { freq: 659.25, dur: 0.4, delay: 0.25 },
    { freq: 523.25, dur: 0.8, delay: 0.5 },
  ],
  // ครบ 45 นาที / เหลือ 10 นาที: กระดิ่งครั้งเดียว (ไม่มีเสียงพูด) — คนละระดับเสียงให้แยกออก
  departure: [{ freq: 783.99, dur: 1.2, delay: 0 }],
  warning: [{ freq: 659.25, dur: 1.2, delay: 0 }],
  timeout: [
    { freq: 440, dur: 0.7, delay: 0 },
    { freq: 440, dur: 0.7, delay: 0.9 },
  ],
};

type Listener = () => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<AudioCue, AudioBuffer | null>();
  private queue: AudioCue[] = [];
  private playing = false;
  private listeners = new Set<Listener>();
  muted = false;
  /** ไฟล์เสียงคำชี้แจงเริ่มสอบที่อัปโหลดเอง (FR-04) — ใช้แทนเสียง "rules" เมื่อมี */
  customName: string | null = null;
  private customData: ArrayBuffer | null = null;
  private customBuf: AudioBuffer | null = null;
  private roomKey: string | null = null;
  /** ชื่อ cue ที่กำลังเล่นอยู่ (ใช้แสดงสถานะบนจอ) */
  current: AudioCue | null = null;
  /** เวลา (ctx) ที่เริ่มเล่นไฟล์ระเบียบการสอบมาตรฐาน — ใช้ไฮไลต์ข้อที่กำลังอ่าน (ไฟล์กำหนดเองไม่นับ) */
  private rulesStartedAt: number | null = null;
  private rulesIsCustom = false;

  /** วินาทีที่เล่นไฟล์ระเบียบการสอบมาตรฐานไปแล้ว — null = ไม่ได้เล่นอยู่ */
  rulesPosition(): number | null {
    return this.ctx && this.rulesStartedAt !== null ? this.ctx.currentTime - this.rulesStartedAt : null;
  }

  get unlocked() {
    return this.ctx !== null && this.ctx.state === "running";
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** เรียกจาก click handler เท่านั้น */
  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.emit();
    void this.preloadAll();
    void this.drain();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.emit();
  }

  enqueue(cue: AudioCue) {
    // เหตุการณ์เดียวกันพร้อมกันหลายวิชา (เช่น 2 วิชาเหลือ 10 นาทีพร้อมกัน) → เล่นครั้งเดียว
    if (this.queue.includes(cue) || this.current === cue) return;
    this.queue.push(cue);
    void this.drain();
  }

  /** โหลดไฟล์เสียงที่เคยอัปโหลดไว้ของห้องนี้ */
  async useRoom(roomId: string) {
    if (this.roomKey === roomId) return;
    this.roomKey = roomId;
    const saved = await loadCustomAudio(roomId);
    this.setCustom(saved?.data ?? null, saved?.name ?? null);
  }

  async setCustomStartFile(file: File) {
    const data = await file.arrayBuffer();
    if (this.roomKey) await saveCustomAudio(this.roomKey, { name: file.name, data: data.slice(0) });
    this.setCustom(data, file.name);
    void this.load("rules");
  }

  async clearCustomStart() {
    if (this.roomKey) await deleteCustomAudio(this.roomKey);
    this.setCustom(null, null);
  }

  /** ฟังตัวอย่างเสียงคำชี้แจงเริ่มสอบ (ข้ามคิว) */
  async previewStart() {
    await this.playCue("rules");
  }

  private setCustom(data: ArrayBuffer | null, name: string | null) {
    this.customData = data;
    this.customName = name;
    this.customBuf = null;
    this.buffers.delete("rules");
    this.emit();
  }

  /** ทดสอบเสียง (ข้ามคิว) */
  async test(cue: AudioCue = "departure") {
    await this.playCue(cue);
  }

  private async preloadAll() {
    await Promise.all((Object.keys(AUDIO_CUES) as AudioCue[]).map((c) => this.load(c)));
  }

  private async load(cue: AudioCue): Promise<AudioBuffer | null> {
    if (this.buffers.has(cue)) return this.buffers.get(cue)!;
    if (!this.ctx) return null;
    let buf: AudioBuffer | null = null;
    if (cue === "rules" && this.customData) {
      try {
        buf = this.customBuf ??= await this.ctx.decodeAudioData(this.customData.slice(0));
      } catch {
        buf = null; // ไฟล์ที่อัปโหลดเสียหาย → ใช้เสียงมาตรฐาน
      }
      if (buf) {
        this.rulesIsCustom = true;
        this.buffers.set(cue, buf);
        return buf;
      }
    }
    if (cue === "rules") this.rulesIsCustom = false;
    // ลองนามสกุลที่เบราว์เซอร์ถอดเสียงได้ตามลำดับ (เช่น chime_timeout.mp3 → .m4a → .mp4 → .wav)
    const base = AUDIO_CUES[cue].replace(/\.[a-z0-9]+$/i, "");
    for (const url of [...new Set([AUDIO_CUES[cue], `${base}.m4a`, `${base}.mp4`, `${base}.wav`])]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        break;
      } catch {
        buf = null; // ถอดรหัสไม่ได้ → ลองไฟล์ถัดไป / ใช้ chime สังเคราะห์
      }
    }
    this.buffers.set(cue, buf);
    return buf;
  }

  private async drain() {
    if (this.playing || !this.unlocked) return;
    this.playing = true;
    while (this.queue.length) {
      const cue = this.queue.shift()!;
      this.current = cue;
      this.emit();
      await this.playCue(cue);
      await new Promise((r) => setTimeout(r, 400));
    }
    this.current = null;
    this.playing = false;
    this.emit();
  }

  private async playCue(cue: AudioCue) {
    if (!this.ctx || this.muted) return;
    const buf = await this.load(cue);
    if (!buf) return this.playNotes(FALLBACK_CHIMES[cue]);
    const track = cue === "rules" && !this.rulesIsCustom;
    await this.playBuffer(buf, (at) => {
      if (track) this.rulesStartedAt = at;
    });
    if (track) this.rulesStartedAt = null;
  }

  private playBuffer(buf: AudioBuffer, onStart?: (ctxTime: number) => void) {
    const ctx = this.ctx!;
    return new Promise<void>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      const at = ctx.currentTime;
      src.start(at);
      onStart?.(at);
    });
  }

  private playNotes(notes: Note[]) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + 0.05;
    let endAt = 0;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, t0 + n.delay);
      gain.gain.setValueAtTime(0.0001, t0 + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + n.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.delay + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.delay);
      osc.stop(t0 + n.delay + n.dur);
      endAt = Math.max(endAt, n.delay + n.dur);
    }
    return new Promise<void>((r) => setTimeout(r, (endAt + 0.1) * 1000));
  }
}

export const audioEngine = new AudioEngine();

