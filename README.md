# Local Farmer Market

โครงสร้าง Full-Stack สำหรับตลาดกลางสินค้าเกษตรชุมชน ใช้ React, TypeScript, Vite และ Express พร้อมการตั้งค่าพื้นฐานสำหรับเชื่อมต่อ Supabase/Prisma ในอนาคต

## Requirements

- Node.js 20.19+ หรือ 22.12+
- npm 10+

## เริ่มต้นใช้งาน

```bash
npm install
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
npm run dev
```

Frontend: http://localhost:5173 · Backend: http://localhost:3000 · Health: http://localhost:3000/api/health

ไฟล์ `.env` เริ่มต้นใช้ค่าว่าง/localhost ไม่มี credentials จริง แอปไม่เชื่อมต่อฐานข้อมูลหรือ Supabase ในขั้นตอนนี้

## คำสั่งตรวจสอบ

```bash
npm run typecheck
npm run build
```

รายละเอียดโครงการและ API อยู่ใน `docs/` ส่วน Prisma schema ยังไม่มี models และไม่มี migration
