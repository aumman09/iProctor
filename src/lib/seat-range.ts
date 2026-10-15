import type { RoomLayoutResponse } from "./types";

/** ช่วงเลขที่นั่งของกลุ่มในผังห้อง เช่น "Seats A1 – A80" / "Seats 1 – 48" — ไม่มีผัง: "Seat A" */
export function seatRangeLabel(layout: RoomLayoutResponse | null, group: string): string {
  const nums = (layout?.seats ?? [])
    .filter((s) => s.group === group)
    .map((s) => Number(s.id.slice(group.length)))
    .filter(Number.isFinite);
  if (!nums.length) return group ? `Seat ${group}` : "";
  return `Seats ${group}${Math.min(...nums)} – ${group}${Math.max(...nums)}`;
}
