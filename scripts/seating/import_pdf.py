"""แปลง PDF ผังที่นั่งสอบของสำนักทะเบียน มฟล. → data/seating/<ROOM_ID>.json

ที่มา: https://reg.mfu.ac.th/th/announcement/examination-seating (PDF อาคารละไฟล์, หน้าละห้อง, เป็น vector)

ใช้งาน:
    pip install pymupdf
    python scripts/seating/import_pdf.py <pdf> [<pdf> ...] [--out data/seating] [--dry-run]

สิ่งที่อ่านจาก PDF:
- ชื่อห้อง: ข้อความใต้ "Examination Seating" (เช่น "C5 302" → roomId "C5-302")
- ที่นั่ง: ข้อความรูปแบบ A12 / B3 / 17 + พิกัด; สีชมพู (#FF00FF) = กลุ่มป้ายชมพู, ดำ = กลุ่มป้ายขาว
- หน้าห้อง: ตำแหน่งข้อความ "White Board" → หมุนผังให้ไวท์บอร์ดอยู่ด้านบนเสมอ
- ผนัง: สี่เหลี่ยมสีแดง; ประตู: สี่เหลี่ยมสีขาวที่ทับบนผนัง
- โต๊ะ: สี่เหลี่ยมขาวที่มีเลขที่นั่งข้างใน; เก้าอี้: รูปทรงโค้งขาว (มีไอคอนคน/เลขที่นั่ง = ที่นั่งสอบ)
- ป้ายแถว: ข้อความ "Row n" (ถ้ามี)

พิกัดทั้งหมดเป็นหน่วย pt ของ PDF หลังหมุน วัดจากมุมซ้ายบนด้านในห้อง
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

import pymupdf

PINK = 0xFF00FF
SEAT_RE = re.compile(r"^([A-Z]?)(\d+)$")
ROW_RE = re.compile(r"^Row\s*\d+$", re.I)
PERSON = "\ue13d"  # ไอคอนคนนั่ง (ฟอนต์สัญลักษณ์) บนเก้าอี้ที่ใช้สอบ


# ---------- geometry ----------

def rotator(front: str, w: float, h: float):
    """คืนฟังก์ชันหมุนจุด (x, y) ให้ผนังฝั่ง `front` ไปอยู่ด้านบน"""
    if front == "LEFT":
        return lambda x, y: (h - y, x)
    if front == "RIGHT":
        return lambda x, y: (y, w - x)
    if front == "BOTTOM":
        return lambda x, y: (w - x, h - y)
    return lambda x, y: (x, y)


def rotate_box(rot, box):
    x0, y0, x1, y1 = box
    pts = [rot(x0, y0), rot(x1, y1), rot(x0, y1), rot(x1, y0)]
    return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))


def nearest_wall(cx: float, cy: float, inner) -> tuple[str, float]:
    x0, y0, x1, y1 = inner
    dist = {"TOP": abs(cy - y0), "BOTTOM": abs(cy - y1), "LEFT": abs(cx - x0), "RIGHT": abs(cx - x1)}
    wall = min(dist, key=dist.get)
    at = (cx - x0) / (x1 - x0) if wall in ("TOP", "BOTTOM") else (cy - y0) / (y1 - y0)
    return wall, round(min(max(at, 0.0), 1.0), 3)


# ---------- page parsing ----------

def is_fill(dr, rgb) -> bool:
    f = dr.get("fill")
    return f is not None and all(abs(a - b) < 0.05 for a, b in zip(f, rgb))


def overlap_ratio(a, b) -> float:
    ix = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    iy = max(0.0, min(a.y1, b.y1) - max(a.y0, b.y0))
    area = a.width * a.height
    return (ix * iy) / area if area else 0.0


def parse_page(page: pymupdf.Page, source: str) -> tuple[dict | None, list[str]]:
    warn: list[str] = []
    w, h = page.rect.width, page.rect.height
    spans = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]

    title = next((s for s in spans if s["text"].strip() == "Examination Seating"), None)
    if not title:
        return None, ["ไม่พบหัวเรื่อง 'Examination Seating' — ข้ามหน้า"]
    ty = title["bbox"][3]
    # ชื่อห้องใช้ฟอนต์ขนาดเดียวกับหัวเรื่อง (ข้อความท้ายหน้าเล็กกว่า)
    name = " ".join(
        s["text"].strip() for s in spans
        if ty - 2 <= s["bbox"][1] <= ty + 30 and abs(s["size"] - title["size"]) < 1 and s is not title
    )
    room_id = re.sub(r"\s+", "-", name.strip()).upper()
    if not room_id:
        return None, ["ไม่พบชื่อห้อง — ข้ามหน้า"]

    # ผนัง (แดง) → ขอบในของห้อง
    drawings = page.get_drawings()
    walls = [dr["rect"] for dr in drawings if is_fill(dr, (1, 0, 0))]
    if not walls:
        return None, [f"{room_id}: ไม่พบผนังสีแดง — ข้ามหน้า"]
    outer = pymupdf.Rect(walls[0])
    for r in walls[1:]:
        outer |= r
    thick = min(min(r.width, r.height) for r in walls)
    inner = (outer.x0 + thick, outer.y0 + thick, outer.x1 - thick, outer.y1 - thick)

    # หน้าห้อง = ผนังที่ใกล้ข้อความ White Board
    wb = next((s for s in spans if "white board" in s["text"].lower()), None)
    wb_rect = None
    if wb:
        bx = wb["bbox"]
        front, _ = nearest_wall((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2, inner)
    else:
        # บางห้องไม่มีป้าย → หาแถบสีขาวยาวบาง ๆ ที่ชิดผนัง (รูปไวท์บอร์ด)
        boards = [
            dr["rect"] for dr in drawings
            if is_fill(dr, (1, 1, 1)) and max(dr["rect"].width, dr["rect"].height) > 100
            and min(dr["rect"].width, dr["rect"].height) <= 12
            and max(dr["rect"].width, dr["rect"].height) / max(1, min(dr["rect"].width, dr["rect"].height)) > 8
            and min(abs(dr["rect"].x0 - inner[0]), abs(dr["rect"].x1 - inner[2]), abs(dr["rect"].y0 - inner[1]), abs(dr["rect"].y1 - inner[3])) < 3
        ]
        if boards:
            wb_rect = max(boards, key=lambda r: max(r.width, r.height))
            front, _ = nearest_wall((wb_rect.x0 + wb_rect.x1) / 2, (wb_rect.y0 + wb_rect.y1) / 2, inner)
            warn.append(f"{room_id}: ไม่มีป้าย 'White Board' — ใช้แถบชิดผนังฝั่ง {front} เป็นไวท์บอร์ด (ควรตรวจ)")
        else:
            front = "TOP"
            warn.append(f"{room_id}: ไม่พบไวท์บอร์ด — ถือว่าหน้าห้องอยู่ด้านบน")
    rot = rotator(front, w, h)
    inner_r = rotate_box(rot, inner)

    # ประตู = สี่เหลี่ยมขาวที่ทับบนผนัง (ยาวพอสมควร ไม่ใช่เส้นเล็ก ๆ)
    doors = []
    for dr in drawings:
        r = dr["rect"]
        if not is_fill(dr, (1, 1, 1)) or not 25 <= max(r.width, r.height) <= 90:
            continue
        if any(overlap_ratio(r, wr) > 0.8 for wr in walls):
            cx, cy = rot((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
            wall, at = nearest_wall(cx, cy, inner_r)
            if not any(d["wall"] == wall and abs(d["at"] - at) < 0.05 for d in doors):
                doors.append({"wall": wall, "at": at})
    if not doors:
        warn.append(f"{room_id}: ไม่พบประตู")

    ox, oy = inner_r[0], inner_r[1]

    def box(r) -> dict:
        """กล่องในพิกัดห้องที่หมุนแล้ว (มุมซ้ายบนของห้อง = 0,0)"""
        x0, y0, x1, y1 = rotate_box(rot, (r.x0, r.y0, r.x1, r.y1))
        return {"x": round(x0 - ox, 1), "y": round(y0 - oy, 1), "w": round(x1 - x0, 1), "h": round(y1 - y0, 1)}

    def inside_room(cx: float, cy: float) -> bool:
        return inner[0] <= cx <= inner[2] and inner[1] <= cy <= inner[3]

    # ที่นั่ง = ข้อความเลขที่นั่ง
    seats_raw = []
    for s in spans:
        t = s["text"].strip()
        m = SEAT_RE.match(t)
        x0, y0, x1, y1 = s["bbox"]
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if not m or not inside_room(cx, cy):
            continue
        rx, ry = rot(cx, cy)
        seats_raw.append({
            "id": t, "group": m.group(1), "num": int(m.group(2)), "pink": s["color"] == PINK,
            "x": round(rx - ox, 1), "y": round(ry - oy, 1), "cx": cx, "cy": cy, "size": s["size"],
        })
    if not seats_raw:
        return None, warn + [f"{room_id}: ไม่พบที่นั่ง — ข้ามหน้า"]

    ids = [s["id"] for s in seats_raw]
    dups = sorted({i for i in ids if ids.count(i) > 1})
    if dups:
        warn.append(f"{room_id}: เลขที่นั่งซ้ำ {dups}")

    # โต๊ะ = สี่เหลี่ยมขาวที่มีเลขที่นั่งอยู่ข้างใน
    desks, seen = [], set()
    for dr in drawings:
        r = dr["rect"]
        if not is_fill(dr, (1, 1, 1)) or [i[0] for i in dr["items"]] not in (["re"], ["l"] * 4) or max(r.width, r.height) > 150:
            continue
        key = tuple(round(v) for v in r)
        if key in seen or not any(r.x0 <= s["cx"] <= r.x1 and r.y0 <= s["cy"] <= r.y1 for s in seats_raw):
            continue
        seen.add(key)
        desks.append(box(r))

    # เก้าอี้ = รูปทรงโค้งสีขาวขนาดเล็ก; มีไอคอนคนหรือเลขที่นั่งอยู่ข้างใน = ที่นั่งสอบ
    people = [((s["bbox"][0] + s["bbox"][2]) / 2, (s["bbox"][1] + s["bbox"][3]) / 2) for s in spans if s["text"].strip() == PERSON]
    chairs, seen = [], set()
    for dr in drawings:
        r = dr["rect"]
        if not is_fill(dr, (1, 1, 1)) or not any(i[0] == "c" for i in dr["items"]) or not (8 <= r.width <= 50 and 8 <= r.height <= 50):
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        key = (round(cx), round(cy))
        if key in seen or not inside_room(cx, cy):
            continue
        seen.add(key)
        label = next((s for s in seats_raw if r.x0 <= s["cx"] <= r.x1 and r.y0 <= s["cy"] <= r.y1), None)
        used = label is not None or any(r.x0 - 1 <= px <= r.x1 + 1 and r.y0 - 1 <= py <= r.y1 + 1 for px, py in people)
        chair = box(r)
        if used:
            near = label or min(seats_raw, key=lambda s: (s["cx"] - cx) ** 2 + (s["cy"] - cy) ** 2)
            chair["seat"] = near["id"]
        chairs.append(chair)
    used_chairs = sum(1 for c in chairs if "seat" in c)
    if chairs and used_chairs != len(seats_raw):
        warn.append(f"{room_id}: เก้าอี้ที่มีคนนั่ง {used_chairs} ตัว ไม่เท่ากับเลขที่นั่ง {len(seats_raw)} ตัว")
    if not chairs and not desks:
        warn.append(f"{room_id}: ไม่พบโต๊ะ/เก้าอี้ (อาจวาดเป็นรูปภาพ) — แสดงเฉพาะเลขที่นั่ง")

    # ไวท์บอร์ด = สี่เหลี่ยมที่ครอบข้อความ White Board
    whiteboard = box(wb_rect) if wb_rect else None
    if wb:
        bx = wb["bbox"]
        cx, cy = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2
        cand = [dr["rect"] for dr in drawings if dr["rect"].x0 <= cx <= dr["rect"].x1 and dr["rect"].y0 <= cy <= dr["rect"].y1
                and max(dr["rect"].width, dr["rect"].height) < 400 and dr["rect"].width * dr["rect"].height > 50]
        if cand:
            whiteboard = box(min(cand, key=lambda r: r.width * r.height))

    groups: dict[str, set[str]] = {}
    for s in seats_raw:
        groups.setdefault(s["group"], set()).add("pink" if s["pink"] else "white")
    group_list = []
    for key in sorted(groups):
        themes = groups[key]
        if len(themes) > 1:
            warn.append(f"{room_id}: กลุ่ม '{key or '-'}' มีหลายสี {sorted(themes)}")
        group_list.append({"key": key, "colorTheme": "pink" if "pink" in themes else "white"})
        nums = sorted(s["num"] for s in seats_raw if s["group"] == key)
        missing = sorted(set(range(1, nums[-1] + 1)) - set(nums))
        if missing:
            warn.append(f"{room_id}: กลุ่ม '{key or '-'}' ไม่มีเลข {missing[:10]}{' …' if len(missing) > 10 else ''}")

    # ป้ายแถว "Row n" (อาจอยู่นอกผนัง)
    row_labels = []
    for s in spans:
        t = s["text"].strip()
        if ROW_RE.match(t):
            x0, y0, x1, y1 = s["bbox"]
            rx, ry = rot((x0 + x1) / 2, (y0 + y1) / 2)
            row_labels.append({"label": t, "x": round(rx - ox, 1), "y": round(ry - oy, 1)})

    seats = [{"id": s["id"], "x": s["x"], "y": s["y"], "group": s["group"]} for s in sorted(seats_raw, key=lambda s: (s["y"], s["x"]))]
    layout = {
        "roomId": room_id,
        "title": f"Examination Seating {name.strip()}",
        "size": {"w": round(inner_r[2] - inner_r[0], 1), "h": round(inner_r[3] - inner_r[1], 1)},
        "labelSize": round(statistics.median(s["size"] for s in seats_raw), 1),
        "whiteboard": whiteboard,
        "doors": sorted(doors, key=lambda d: (d["wall"], d["at"])),
        "groups": group_list,
        "seats": seats,
        "desks": sorted(desks, key=lambda d: (d["y"], d["x"])),
        "chairs": sorted(chairs, key=lambda c: (c["y"], c["x"])),
        "source": {"file": source, "page": page.number + 1, "front": front},
    }
    if not whiteboard:
        del layout["whiteboard"]
    if row_labels:
        layout["rowLabels"] = row_labels
    return layout, warn


# ---------- output ----------

def dump(layout: dict) -> str:
    """JSON อ่านง่าย: ที่นั่งบรรทัดละ 1 ตัว"""
    lines = ["{"]
    keys = list(layout)
    for i, k in enumerate(keys):
        comma = "," if i < len(keys) - 1 else ""
        v = layout[k]
        if k in ("seats", "groups", "doors", "rowLabels", "desks", "chairs") and v:
            lines.append(f'  "{k}": [')
            lines += [f"    {json.dumps(x, ensure_ascii=False)}" + ("," if j < len(v) - 1 else "") for j, x in enumerate(v)]
            lines.append(f"  ]{comma}")
        else:
            lines.append(f'  "{k}": {json.dumps(v, ensure_ascii=False)}{comma}')
    lines.append("}")
    return "\r\n".join(lines) + "\r\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path("data/seating"))
    ap.add_argument("--dry-run", action="store_true", help="แค่แสดงรายงาน ไม่เขียนไฟล์")
    args = ap.parse_args()

    total, warnings = 0, []
    for pdf in args.pdf:
        doc = pymupdf.open(pdf)
        for page in doc:
            layout, warn = parse_page(page, pdf.name)
            warnings += warn
            if not layout:
                continue
            total += 1
            g = ", ".join(f"{x['key'] or '-'}={x['colorTheme']}" for x in layout["groups"])
            print(f"{layout['roomId']:<8} {len(layout['seats']):>4} ที่  โต๊ะ {len(layout['desks']):>3}  เก้าอี้ {len(layout['chairs']):>3}  "
                  f"หน้าห้อง={layout['source']['front']:<6} ประตู {len(layout['doors'])}  กลุ่ม [{g}]")
            if not args.dry_run:
                args.out.mkdir(parents=True, exist_ok=True)
                (args.out / f"{layout['roomId']}.json").write_bytes(dump(layout).encode("utf-8"))

    print(f"\nรวม {total} ห้อง" + (" (dry-run ไม่ได้เขียนไฟล์)" if args.dry_run else f" → {args.out}"))
    if warnings:
        print(f"\nต้องตรวจ ({len(warnings)}):")
        for x in warnings:
            print(f"  - {x}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
