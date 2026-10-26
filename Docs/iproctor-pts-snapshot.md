# MFU PTS Project Tracking Snapshot v1

<!-- คำแนะนำการกรอกสถานะ:
- งานไหนทำเสร็จแล้ว ➔ ใส่ done (ใส่เลข Commit หรือ PR ในช่อง evidence ถ้ามี)
- งานไหนกำลังทำอยู่ ➔ ใส่ in_progress
- งานไหนติดปัญหา ➔ ใส่ blocked พร้อมใส่เหตุผลในช่อง blocker
- งานไหนยังไม่เริ่ม ➔ ใส่ todo
-->

ใช้ไฟล์นี้นำเข้า **ข้อมูลติดตามงานของโครงการ** เข้า PTS 

## Module: Authentication & Access
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-AUTH-001 | เข้าสู่ระบบแบบทดสอบ (Mock Login) แยกสิทธิ์ผู้คุมสอบ / ฝ่ายจัดสอบ | done | 1.5 | | commit: d31b9b7 |
| IPR-AUTH-002 | เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (MFU SSO) | todo | 3.0 | รอข้อมูลการเชื่อมต่อ SSO | |

## Module: Proctor Portal
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-PTL-001 | ตารางเวรคุมสอบของตนเอง แยกช่วงกลางภาค / ปลายภาค | done | 3.0 | | commit: 4b04ffd |
| IPR-PTL-002 | เปิดหน้าจอคุมสอบได้ 30 นาทีก่อนสอบ และค้นหาห้องกรณีคุมสอบแทน | done | 2.0 | | commit: 4b04ffd |
| IPR-PTL-003 | ยืนยัน "สอบเสร็จ / ส่งข้อสอบแล้ว" รายวิชา | done | 2.0 | | commit: 77b88cc |
| IPR-PTL-004 | เพิ่มเวรลงปฏิทินอีเมล | todo | 2.5 | | |

## Module: Exam Room Screen
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-SCR-001 | นาฬิกามาตรฐานมหาวิทยาลัยและนับถอยหลังแยกรายวิชา | done | 3.0 | | commit: d31b9b7 |
| IPR-SCR-002 | ประกาศเสียงอัตโนมัติตามเวลา (เปิดห้อง เริ่มสอบ 45 นาที เหลือ 10 นาที หมดเวลา) | done | 4.0 | | commit: d31b9b7 |
| IPR-SCR-003 | เสียงคำชี้แจงกำหนดเอง และเสียงระเบียบการสอบ | done | 2.0 | | commit: 6812751 |
| IPR-SCR-004 | หน้าระเบียบการสอบสองภาษา ไฮไลต์ข้อที่กำลังอ่าน | done | 2.5 | | commit: 5b2a692 |
| IPR-SCR-005 | ประกาศ/โน้ตจากกรรมการขึ้นจอได้ทันที | done | 2.0 | | commit: 4b04ffd |
| IPR-SCR-006 | ปรับหน้าจอให้พอดีโปรเจกเตอร์ 4:3 และเมนูภาษาอังกฤษ | done | 1.5 | | commit: 5b2a692 |
| IPR-SCR-007 | แจ้งเตือน 45 นาทีปิดอัตโนมัติ | done | 1.0 | | commit: fbb608b |
| IPR-SCR-008 | อัปโหลดเสียงกำหนดเองขึ้นเซิร์ฟเวอร์ (ปัจจุบันเก็บในเครื่องฉาย) | todo | 2.5 | | |

## Module: Seating Plan
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-SEAT-001 | ผังที่นั่งสอบตามผังจริง (โต๊ะ เก้าอี้ ประตู สีป้าย) แสดงเต็มจอก่อนสอบ | done | 4.0 | | commit: ef375c1 |
| IPR-SEAT-002 | นำเข้าผังห้องสอบ 131 ห้อง 10 อาคาร จาก PDF สำนักทะเบียน | done | 4.0 | | commit: ef375c1 |
| IPR-SEAT-003 | การ์ดวิชาหลายกลุ่มพร้อมช่วงที่นั่ง และผังแสดงด้านหน้าห้องไว้ด้านบน | done | 2.0 | | commit: e422fc9, 6812751 |

## Module: Admin Panel
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-ADM-001 | ติดตามสถานะการส่งข้อสอบรายวิชาและรายห้อง | done | 3.0 | | commit: 77b88cc |
| IPR-ADM-002 | แสดงห้องที่กำลังคุมสอบอยู่แบบเรียลไทม์ | done | 2.0 | | commit: 3f9ecf7 |
| IPR-ADM-003 | ข้อกำหนดเพิ่มเติมรายวิชาขึ้นจอห้องสอบ | done | 2.0 | | commit: 77b88cc |
| IPR-ADM-004 | ตั้งเวลาแจ้งเตือนของทุกห้อง | done | 2.0 | | commit: 77b88cc |
| IPR-ADM-005 | จำลองหน้าจอคุมสอบก่อนใช้งานจริง | done | 1.5 | | commit: 77b88cc |
| IPR-ADM-006 | สถิติการใช้งานระบบ | done | 1.5 | | commit: 77b88cc |

## Module: Data & Integration
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-DAT-001 | ฐานข้อมูลรอบสอบ ห้อง รายวิชา ผู้คุมสอบ รองรับนำเข้าซ้ำทุกภาค | done | 4.0 | | commit: 4b04ffd |
| IPR-DAT-002 | เชื่อม Blendata นำเข้าตารางสอบ กลุ่มที่นั่ง และผู้คุมสอบอัตโนมัติ | blocked | 5.0 | รอ API (URL / token / เอกสาร) จาก Blendata | |
| IPR-DAT-003 | นโยบายลบข้อมูลส่วนบุคคลเกิน 1 ปี และเก็บ PDF ผังต้นฉบับ | todo | 2.0 | | |

## Module: Deployment & Quality
| task_id | title | status | estimated_md | blocker | evidence |
|---|---|---|---:|---|---|
| IPR-DEP-001 | ติดตั้งบนเซิร์ฟเวอร์ beta (Docker + Nginx) แยกจากระบบ PTS | done | 2.0 | | commit: 77b88cc, a023994; https://iproctor.beta.mfu.ac.th |
| IPR-QA-001 | ชุดทดสอบอัตโนมัติ (schedule engine และ flow หลัก) | todo | 3.0 | | |
