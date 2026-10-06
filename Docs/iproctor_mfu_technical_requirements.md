# Technical Requirements Specification (SRS / Task Requirements)

**Project Name:** iProctor MFU (Intelligent Exam Room Controller & Proctor Portal)  
**Target URL:** `https://iproctor.mfu.ac.th/`  
**Purpose:** Developer & AI Implementation Roadmap for End-to-End Exam Management & Projector Controller  
**Version:** 2.0.0  

---

## 1. User Journey & System Workflow (สโคปใหม่)

```
[1. SSO Login (MFU Account)]
          │
          ▼
[2. Proctor Portal / My Duty Dashboard]
  - Filter: Term / Exam Period (e.g. Midterm 1/2026, Final 1/2026)
  - Duty Cards: Date, Time Session (Morning/Afternoon), Building, Room, Status
  - "Enter Current Exam" Quick Button (Highlight active shift)
          │ (Click on a specific duty date/room)
          ▼
[3. iProctor Controller Screen (Projector View)]
  - Minimalist Display (Speaak.ai style)
  - Real-Time Official Clock & Timers (Web Worker)
  - Visual Seating Chart (ผังที่นั่งในห้องสอบจริง)
  - Sound Control & Custom Audio Slot (ให้อัปโหลด/เลือกไฟล์เสียงคำชี้แจงเองได้)
  - Automated Notifications (45-min Departure, 10-min Course Warning, Time's Up)
```

---

## 2. Functional Requirements (FR) Breakdown

### FR-01: Authentication & Authorization (MFU SSO)
* **FR-01.1:** เข้าสู่ระบบด้วย MFU Single Sign-On (OAuth2 / OIDC).
* **FR-01.2:** รองรับ Mock Login สำหรับการพัฒนาและทดสอบ (เลือก Login เป็นอาจารย์ผู้คุมสอบ หรือ Admin กลาง).

### FR-02: Proctor Portal & Exam Schedule Dashboard (หน้าตารางคุมสอบ)
* **FR-02.1 Academic Period Selector:** ดรอปดาวน์เลือกภาคการศึกษาและช่วงสอบ เช่น:
  * `Midterm Examination 1/2026`
  * `Final Examination 1/2026`
* **FR-02.2 Duty Calendar / List View:** แสดงรายการเวรคุมสอบทั้งหมดของ Staff คนนั้น:
  * **วันที่จัดสอบ (Date):** เช่น `30 ก.ย. 2026`
  * **รอบการสอบ (Session):** รอบเช้า (`09:00 - 12:00`) หรือรอบบ่าย (`13:30 - 16:30`)
  * **สถานที่ (Venue):** เช่น `อาคาร C3 ห้อง 107`
  * **วิชาและแถวที่รับผิดชอบ:** เช่น `Cruise Operations (Row A), Physical Therapy (Row B)`
  * **สถานะเวร:** `Upcoming` (ยังไม่ถึง), `In Session / Open Now` (เปิดห้องได้แล้ว), `Completed` (สอบเสร็จแล้ว)
* **FR-02.3 Direct Launch Button:**
  * หากถึงวันและเวลาสอบ (ก่อนเริ่ม 30 นาที) การ์ดเวรนั้นจะขึ้นไฮไลต์สีเขียว พร้อมปุ่มเด่นชัด **"เปิดหน้าจอคุมสอบ (Launch iProctor)"** เพื่อเข้าสู่หน้าจอฉายโปรเจกเตอร์ของห้องนั้นทันที
* **FR-02.4 Duty Substitute / Search:** ค้นหาตารางห้องอื่นได้ เผื่อกรณีคุมสอบแทน (Substitute Proctor).

### FR-03: Visual Exam Hall Seating Chart (ผังที่นั่งห้องสอบ)
* **FR-03.1 Interactive Layout:** หน้าจอ iProctor มีปุ่มสลับมุมมองหรือ Modal ขยาย **"ผังที่นั่งห้องสอบ (Seating Chart)"**:
  * จำลองผังห้องจริงตามอาคาร (เช่น ห้อง C3 107 มีแถว A, B, C...)
  * แสดงสีประจำแถวตรงกับป้ายกระดาษจริง (เช่น แถว 1 / A = สีชมพู, แถว 2 / B = สีขาว)
  * แสดงเลขที่นั่ง เช่น `A1 ◄──► A10`, `B1 ◄──► B10` และทิศทางประตูทางเข้าห้อง/ตำแหน่งโปรเจกเตอร์
* **FR-03.2 Examinee Range Indicator:** ระบุช่วงรหัสนักศึกษาชัดเจนกำกับแต่ละแถว เพื่อให้นักศึกษาเดินไปนั่งได้ถูกต้องโดยไม่ต้องถามกรรมการ

### FR-04: Custom Audio Management (ระบบจัดการไฟล์เสียงคำชี้แจง)
* **FR-04.1 Custom Start Audio Upload/Selection:**
  * กรรมการ/แอดมินสามารถกำหนดไฟล์เสียงคำชี้แจงเริ่มสอบเองได้ (`custom_start_instruction.mp3` หรือ `.wav`)
  * มีปุ่มทดสอบฟังเสียง (Preview Audio) ก่อนเริ่มฉายจอจริง
* **FR-04.2 Automated Trigger:**
  * เมื่อเวลาแตะ `09:00:00` (รอบเช้า) หรือ `13:30:00` (รอบบ่าย) ระบบจะสั่งเล่นไฟล์เสียงคำชี้แจงที่เตรียมไว้อัตโนมัติ
* **FR-04.3 Native Fallback Chimes:**
  * เสียงสัญญาณเตือนมาตรฐานอื่น ๆ (เตือนครบ 45 นาที, เตือน 10 นาทีสุดท้าย, หมดเวลา) จะใช้เสียงกระดิ่ง Chime อัตโนมัติจาก Web Audio API เพื่อความเสถียร 100%

### FR-05: Projector Display & Multi-Course Controller
* **FR-05.1 Speaak Minimalist Aesthetics:** หน้าจอหลักคลีน เรียบหรู อิงดีไซน์ตามที่ออกแบบไว้
* **FR-05.2 Multi-Course Independent Timers:** แยกเวลานับถอยหลังระหว่างวิชา 2 ชม. (จบ 15:30) และวิชา 3 ชม. (จบ 16:30)
* **FR-05.3 Automated 45-Min Departure Alert:** เมื่อครบ 45 นาที เล่นเสียงเตือน 2 จังหวะ + แสดง Modal อนุญาตให้ออกจากห้องสอบ
* **FR-05.4 Live Proctor Notes:** กล่องโน้ตหน้าจอแก้ไขข้อความสดได้

---

## 3. Data Schema & Mock API

### 3.1 Proctor Schedule API
`GET /api/v1/proctor/duties?term=1-2569&type=midterm`

```typescript
export interface ProctorDuty {
  dutyId: string;
  examPeriod: "Midterm 1/2026" | "Final 1/2026";
  date: string; // "2026-09-30"
  session: "morning" | "afternoon";
  sessionTime: string; // "13:30 - 16:30"
  building: string;   // "C3"
  roomNumber: string; // "107"
  isCurrentSession: boolean;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  customAudioUrl?: string; // ลิงก์ไฟล์เสียงคำชี้แจงที่อัปโหลดไว้
  coursesSummary: Array<{
    courseCode: string;
    courseName: string;
    rowLabel: string;
    seatColorTheme: "pink" | "white";
  }>;
}
```

### 3.2 Room Seating Layout Schema
`GET /api/v1/exam-rooms/{roomId}/seating`

```typescript
export interface SeatingRow {
  rowLabel: string; // "A", "B"
  colorTheme: "pink" | "white";
  paperTagLabel: string; // "Row 1 (A1 - A10)"
  leftSeatRange: string;  // "A1 - A5"
  rightSeatRange: string; // "A6 - A10"
  studentIdRange: string; // "6731205017 - 6931205901"
  courseName: string;
}

export interface RoomLayoutResponse {
  roomId: string; // "C3-107"
  projectorPosition: "FRONT_CENTER";
  doorPositions: ["FRONT_LEFT", "BACK_LEFT"];
  rows: SeatingRow[];
}
```

---

## 4. ข้อเสนอแนะเพิ่มเติมจากผู้เชี่ยวชาญ (Recommendations)

1. **Pre-Exam Mode vs. During-Exam Mode (ปุ่มสลับโหมดอัตโนมัติ):**
   * **ก่อนสอบ (08:45 - 09:00 / 13:15 - 13:30):** หน้าจอควรเน้น **"ผังที่นั่งห้องสอบ (Seating Chart)" ตัวใหญ่เต็มจอ** เพื่อให้นักศึกษาเดินเข้ามาแล้วเห็นตำแหน่งโต๊ะตัวเองทันที
   * **เริ่มสอบ (09:00 / 13:30 เป็นต้นไป):** หน้าจอจะย่อผังที่นั่งลง หรือสลับมาเน้น **"เวลานาฬิกา + เวลาที่เหลือนับถอยหลัง"** แทน เพื่อความสบายตา
2. **Audio File Preload & Fallback:**
   * ให้ระบบทำการดาวน์โหลดและแคชไฟล์เสียงที่อัปโหลดไว้ล่วงหน้า (Preload) ตั้งแต่อาจารย์เปิดหน้าห้องสอบ ป้องกันปัญหาเสียงสะดุดหากเน็ตช้าตอนเริ่มสอบ
3. **QR Code สำหรับนักศึกษา:**
   * เพิ่มปุ่มแสดง QR Code เล็ก ๆ ที่มุมจอ ให้นักศึกษาสแกนเปิดดูผังที่นั่งบนมือถือของตัวเองได้ด้วย ลดความแออัดหน้าบอร์ดหน้าห้องสอบ