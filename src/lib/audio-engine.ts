"use client";

// Web Audio Engine
// - ต้อง unlock() จากการคลิกของผู้ใช้ครั้งแรก (browser autoplay policy)
// - เล่นเสียงตามคิวทีละรายการ ไม่ซ้อนกัน
// - ถ้าไม่พบไฟล์เสียงใน public/audio/ จะเล่น chime สังเคราะห์แทน

import { AUDIO_CUES, type AudioCue } from "./config";

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
  departure: [
    { freq: 523.25, dur: 0.3, delay: 0 },
    { freq: 659.25, dur: 0.5, delay: 0.2 },
  ],
  warning: [{ freq: 659.25, dur: 0.45, delay: 0 }],
  timeout: [
    { freq: 440, dur: 0.7, delay: 0 },
    { freq: 440, dur: 0.7, delay: 0.9 },
  ],
};

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<AudioCue, AudioBuffer | null>();
  private queue: AudioCue[] = [];
  private playing = false;
  private listeners = new Set<Listener>();
  muted = false;
  /** ชื่อ cue ที่กำลังเล่นอยู่ (ใช้แสดงสถานะบนจอ) */
  current: AudioCue | null = null;

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
    this.queue.push(cue);
    void this.drain();
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
    try {
      const res = await fetch(AUDIO_CUES[cue]);
      if (res.ok) buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      buf = null; // ไม่มีไฟล์หรือถอดรหัสไม่ได้ → ใช้ chime สังเคราะห์
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
    if (buf) await this.playBuffer(buf);
    else await this.playNotes(FALLBACK_CHIMES[cue]);
  }

  private playBuffer(buf: AudioBuffer) {
    const ctx = this.ctx!;
    return new Promise<void>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      src.start();
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
