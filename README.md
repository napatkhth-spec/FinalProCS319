# Local Farmer Market

แพลตฟอร์มตลาดสินค้าเกษตรท้องถิ่น เชื่อมต่อผู้ซื้อกับเกษตรกร ให้ผู้ซื้อค้นหาและสั่งซื้อสินค้า ส่วนเกษตรกรเปิดร้านและจัดการสินค้าได้ โดยผู้ดูแลระบบตรวจสอบร้านค้าก่อนเริ่มขาย

## ความสามารถหลัก

- ผู้ซื้อสมัครสมาชิก เข้าสู่ระบบ ค้นหาสินค้า จัดการที่อยู่ สร้างคำสั่งซื้อ และเขียนรีวิว
- เกษตรกรส่งคำขอเปิดร้าน หลังผ่านการอนุมัติจึงจัดการสินค้าและรูปสินค้าได้
- ผู้ดูแลระบบอนุมัติร้านค้าและจัดการหมวดหมู่
- สินค้าและข้อมูลรูปภาพจัดเก็บผ่าน PostgreSQL; รูปภาพอยู่ใน `ProductImage` แบบ `BYTEA` ไม่ใช้ Supabase Storage
- สถานะที่ระบุในเอกสารแยกตามหลักฐานจากโค้ดและชุดทดสอบ ไม่ถือว่าเป็นการทดสอบระบบครบวงจร

## Technology Stack

| ส่วน | เทคโนโลยีที่ใช้ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 4 |
| Client state | Zustand; TanStack Query สำหรับข้อมูลจาก API |
| Backend | Node.js, TypeScript, Express 5 |
| Database / ORM | PostgreSQL, Prisma ORM 7 และ PrismaPg adapter |
| Authentication | JWT แบบ Bearer ผ่าน `jose`, รหัสผ่าน hash ด้วย Argon2 |
| Validation / Upload | Zod, Multer แบบ memory storage |

## Architecture

Frontend เรียก Backend ผ่าน Axios โดยใช้ `VITE_API_URL` เป็น base URL (ค่าในตัวอย่างคือ `http://localhost:3000/api`). Backend ให้บริการ REST API ใต้ `/api`, ตรวจสอบข้อมูลและสิทธิ์ แล้วเข้าถึง PostgreSQL ผ่าน Prisma Client และ `DATABASE_URL`. Prisma CLI ใช้ `DIRECT_URL` ตาม `backend/prisma7.config.ts` สำหรับ migration และ seed

รูปสินค้าอัปโหลดเป็น `multipart/form-data`, ตรวจ MIME type และ file signature ก่อนเขียน Bytes ลง `ProductImage.imageData`. API รายการสินค้าไม่ฝัง binary หรือ Base64 แต่คืนข้อมูลประกอบและ URL สำหรับดึงเนื้อหารูปแยกต่างหาก

### Authentication flow

เมื่อ login สำเร็จ Backend ส่ง Access Token อายุ 3,600 วินาที (1 ชั่วโมง) ให้ Frontend เก็บใน `localStorage` ภายใต้ key `local-farmer-market.access-token`. เมื่อเปิดหรือ refresh หน้า `AuthInitializer` จะอ่าน token และเรียก `GET /api/auth/me`; Frontend ตั้งตัวจับเวลาจาก claim `exp` และล้าง Auth State, token และ query cache เมื่อหมดอายุหรือ token ไม่ถูกต้อง. Logout ฝั่ง Frontend ล้าง token และสถานะผู้ใช้. ระบบไม่มีการใช้ Refresh Token หรือ HttpOnly cookie ใน flow ที่ทำงานอยู่; endpoint เก่า `/api/auth/refresh` และ `/api/auth/logout-all` ตอบสถานะ Gone (410). `AuthSession` ใน Schema ไม่ได้ถูกใช้โดย flow นี้

Roles: `BUYER`, `FARMER`, `ADMIN`. สิทธิ์ตรวจทั้ง role, สถานะร้าน และเจ้าของข้อมูลตาม endpoint. การสร้างหรือแก้ไขสินค้าและจัดการรูปต้องเป็น Farmer ที่ `APPROVED` และเป็นเจ้าของสินค้านั้น

## Requirements and setup

- Node.js 22.12 ขึ้นไป และ npm 10 ขึ้นไป (Vite 7 และการรัน Frontend tests ด้วย Node type stripping ต้องการ runtime รุ่นใหม่)
- PostgreSQL ที่เข้าถึงได้จากเครื่อง Backend
- ติดตั้ง dependencies จาก root:

```bash
npm install
```

คัดลอกไฟล์ตัวอย่างเป็นไฟล์ environment ในเครื่องและกำหนดค่าผ่าน secret manager หรือไฟล์ที่ไม่ commit:

```text
backend/.env.example  -> backend/.env
frontend/.env.example -> frontend/.env
```

อย่า commit หรือใส่ค่าจริงของ secrets ใน README. Backend ใช้ `DATABASE_URL` ตอนทำงาน และ Prisma CLI ใช้ `DIRECT_URL`; ต้องกำหนดให้ชี้ไปยังฐานข้อมูล PostgreSQL เดียวกันตามรูปแบบการเชื่อมต่อของ deployment. `ACCESS_TOKEN_SECRET` ต้องมี entropy เพียงพอและมีอย่างน้อย 32 bytes. ตัวแปร issuer, audience และ TTL มีค่าเริ่มต้นในโค้ด; TTL รองรับ 60–3,600 วินาที โดยค่าเริ่มต้นคือ 3,600 วินาที (1 ชั่วโมง)

| ตัวแปร | ใช้ที่ | หน้าที่ / รูปแบบ |
| --- | --- | --- |
| `DATABASE_URL` | Backend | Connection string สำหรับการทำงานของ API ผ่าน PrismaPg |
| `DIRECT_URL` | Prisma CLI | Connection string โดยตรงที่ Prisma config ใช้สำหรับ migration และ seed |
| `ACCESS_TOKEN_SECRET` | Backend | secret สำหรับลงนาม JWT; อย่างน้อย 32 bytes |
| `ACCESS_TOKEN_ISSUER`, `ACCESS_TOKEN_AUDIENCE` | Backend | ตรวจ issuer และ audience ของ access token; มีค่าเริ่มต้น |
| `ACCESS_TOKEN_TTL_SECONDS` | Backend | อายุ token เป็นวินาที; ค่าเริ่มต้น 3,600 (1 ชั่วโมง), ช่วง 60–3,600 |
| `NATIONAL_ID_ENCRYPTION_KEY` | Backend | AES-256-GCM key เป็น Hex 64 ตัวอักษร (ถอดรหัสได้ 32 bytes) |
| `NATIONAL_ID_HASH_SECRET` | Backend | HMAC-SHA256 secret แบบข้อความ UTF-8 ยาวอย่างน้อย 32 ตัวอักษร |
| `PORT` | Backend | พอร์ต HTTP; ค่าเริ่มต้น 3000 |
| `FRONTEND_URL` | Backend | Origin ของ Frontend สำหรับ CORS; ค่าเริ่มต้นในตัวอย่างคือ `http://localhost:5173` |
| `VITE_API_URL` | Frontend | API base URL; ตัวอย่าง `http://localhost:3000/api` |

`NATIONAL_ID_ENCRYPTION_KEY` และ `NATIONAL_ID_HASH_SECRET` ต้องเป็นคนละค่า. สร้างแต่ละค่าแยกกันด้วย CSPRNG แล้วเก็บใน secret manager; encryption key ต้องแปลงเป็น hex 64 ตัวอักษร ส่วน hash secret เก็บเป็นข้อความสุ่มอย่างน้อย 32 ตัวอักษร. ห้ามนำค่าเหล่านี้ลง source control, log หรือเอกสาร. ตัวแปร Supabase Storage/cookie ที่อาจเหลือในไฟล์ตัวอย่างไม่ได้เป็นส่วนของ flow ปัจจุบัน และ Frontend ห้ามรับ secret ที่มี prefix `VITE_`

### Run the app

```bash
# จาก root: เริ่มทั้ง Frontend และ Backend
npm run dev

# หรือเริ่มแยกกัน
npm run dev:backend
npm run dev:frontend
```

Frontend โดยปกติเปิดที่ `http://localhost:5173`; Backend เปิดที่ `http://localhost:3000`. ตรวจสอบ Backend ได้ที่ `GET /api/health`.

## Database and Prisma

Schema หลักอยู่ที่ `backend/prisma/schema.prisma`. Models: `User`, `AuthSession`, `UserRoleAssignment`, `FarmerProfile`, `Category`, `Product`, `ProductImage`, `Address`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Review`.

Enums: `AppRole` (`BUYER`, `FARMER`, `ADMIN`), `FarmerVerificationStatus` (`PENDING`, `APPROVED`, `REJECTED`), `ProductStatus` (`ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`), `OrderStatus` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `PaymentMethod` (`ONLINE`, `COD`), `PaymentStatus` (`PENDING`, `PAID`, `FAILED`, `REFUNDED`).

ความสัมพันธ์สำคัญ: User มี role assignments, FarmerProfile, Cart, Address, Review และคำสั่งซื้อในฐานะผู้ซื้อ; FarmerProfile เป็นเจ้าของ Product และคำสั่งซื้อฝั่งร้าน; Category รองรับหมวดหมู่แม่/ลูกและมี Product; Product เชื่อม Category, FarmerProfile, ProductImage, CartItem, OrderItem และ Review; Order มีผู้ซื้อ ร้าน รายการสินค้า และ Payment. ข้อกำหนด unique เช่น email, SKU, รหัสผู้ใช้ของ FarmerProfile, และรีวิวต่อผู้ใช้/สินค้า บังคับตาม Schema และ migration

`ProductImage.imageData` เป็น `Bytes? @db.ByteA` พร้อม `mimeType` และ `fileSize`; `storagePath` ยังคงอยู่เพื่อความเข้ากันได้. ไม่ต้องสร้าง Storage Bucket. ไฟล์รูปต่อไฟล์จำกัด 5 MB และรองรับ JPEG, PNG, WEBP ตาม validation ใน Backend

Migrations ที่มีใน repository:

| Migration | วัตถุประสงค์โดยย่อ |
| --- | --- |
| `20261122143754_init` | Schema เริ่มต้น |
| `20261122153000_custom_auth_expand` | ขยายข้อมูล authentication |
| `20261123110000_add_farmer_province` | เพิ่มจังหวัดสำหรับโปรไฟล์เกษตรกร |
| `20261123130000_add_product_image_binary` | เพิ่มข้อมูล binary และ metadata ของรูปสินค้า |
| `20261123150000_add_farmer_identity_fields` | เพิ่มข้อมูลเข้ารหัส/ค่า hash สำหรับเลขประจำตัวเกษตรกร |

คำสั่ง Prisma ที่ประกาศใน scripts:

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
npx prisma migrate status --config prisma7.config.ts
```

การ Apply migration เป็นการเปลี่ยนฐานข้อมูลจริง ให้ตรวจ SQL และสถานะก่อน และดำเนินการเฉพาะเมื่อได้รับอนุมัติสำหรับ migration นั้น:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

ห้ามใช้ `prisma db push` หรือ `prisma migrate reset` กับข้อมูลที่ต้องรักษา. เมื่อแก้ Schema ให้สร้าง migration ที่เหมาะสมและทบทวน SQL ก่อน Apply; อย่าแก้ migration ที่ Apply แล้ว

## Farmer shop registration

คำขอเปิดร้านส่ง `shopName`, `contactPhone`, `nationalId` 13 หลัก และ `province`; อาจระบุ `description`, `farmAddress` และ `profileImage` เพิ่ม. เบอร์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก. เลขประจำตัวผ่านการตรวจรูปแบบและ checksum 13 หลัก แต่ระบบไม่ได้เชื่อมต่อเพื่อตรวจสอบกับกรมการปกครอง

เลขประจำตัวถูกเข้ารหัสด้วย AES-256-GCM ก่อนเก็บ และใช้ HMAC-SHA256 เพื่อค้นหาค่าซ้ำโดยไม่เก็บเลขดิบ. ผู้ใช้หนึ่งคนมีโปรไฟล์ร้านได้หนึ่งรายการ, ชื่อร้านมีการ normalize ก่อนตรวจความซ้ำ และค่า HMAC มี unique constraint. สถานะเริ่มต้นคือ `PENDING`; Admin ต้องอนุมัติเป็น `APPROVED` ก่อนเกษตรกรจึงลงสินค้าได้

## API reference

ทุก endpoint อยู่ใต้ `/api`. `Public` หมายถึงไม่ต้องใช้ token; role ที่ระบุหมายถึงต้องส่ง Bearer Access Token และผ่านการตรวจ ownership/status ในกรณีที่เกี่ยวข้อง. API ไม่มี Cart endpoints.

### Health and authentication

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | ตรวจสถานะ Backend |
| POST | `/api/auth/register` | Public | สมัครผู้ใช้ Buyer |
| POST | `/api/auth/login` | Public | เข้าสู่ระบบและรับ Access Token |
| GET | `/api/auth/me` | ผู้ใช้ที่ login | อ่านผู้ใช้ปัจจุบัน |
| POST | `/api/auth/logout` | ผู้ใช้ที่ login | Logout ตาม trusted Origin; Frontend ล้าง token |
| POST | `/api/auth/refresh` | — | endpoint เดิม ตอบ 410 |
| POST | `/api/auth/logout-all` | — | endpoint เดิม ตอบ 410 |

### Products and images

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| GET | `/api/products` | Public | รายการสินค้า; รองรับ `search`, `categoryId`, `farmerId`, `province`, `page`, `pageSize` |
| GET | `/api/products/:id` | Public | รายละเอียดสินค้า |
| GET | `/api/products/:id/images/:imageId/content` | Public | ส่งเนื้อหารูปพร้อม Content-Type |
| GET | `/api/products/mine` | FARMER | สินค้าของร้านตนเอง |
| POST | `/api/products` | FARMER ที่ APPROVED | สร้างสินค้า |
| PATCH | `/api/products/:id` | FARMER ที่ APPROVED และเจ้าของ | แก้ไขสินค้า |
| DELETE | `/api/products/:id` | FARMER ที่ APPROVED และเจ้าของ | เก็บถาวรสินค้า (ตั้ง INACTIVE) |
| POST | `/api/products/:id/images` | FARMER ที่ APPROVED และเจ้าของ | อัปโหลดรูปด้วย `multipart/form-data` |
| PATCH | `/api/products/:id/images/:imageId/primary` | FARMER ที่ APPROVED และเจ้าของ | กำหนดรูปหลัก |
| DELETE | `/api/products/:id/images/:imageId` | FARMER ที่ APPROVED และเจ้าของ | ลบรูปของสินค้าตนเอง |

### Categories and farmers

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| GET | `/api/categories` | Public | รายการหมวดหมู่ |
| GET | `/api/categories/:id` | Public | รายละเอียดหมวดหมู่ |
| POST | `/api/categories` | ADMIN | สร้างหมวดหมู่ |
| PATCH | `/api/categories/:id` | ADMIN | แก้ไขหมวดหมู่ |
| DELETE | `/api/categories/:id` | ADMIN | ลบได้เมื่อไม่มีสินค้า/หมวดลูกที่อ้างอิง |
| GET | `/api/farmers/profile` | FARMER | อ่านโปรไฟล์ร้านของตน |
| POST | `/api/farmers/profile` | BUYER หรือ FARMER | ส่งคำขอเปิดร้าน |
| PATCH | `/api/farmers/profile` | FARMER | แก้ไขโปรไฟล์ตาม validation |
| GET | `/api/farmers/admin/pending` | ADMIN | ดูคำขอร้านที่รออนุมัติ |
| PATCH | `/api/farmers/admin/:id/approve` | ADMIN | อนุมัติร้าน |

### Addresses, orders and reviews

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| GET | `/api/addresses` | BUYER | รายการที่อยู่ของตน |
| GET | `/api/addresses/:id` | BUYER | รายละเอียดที่อยู่ของตน |
| POST | `/api/addresses` | BUYER | เพิ่มที่อยู่ |
| PATCH | `/api/addresses/:id` | BUYER | แก้ไขที่อยู่ของตน |
| DELETE | `/api/addresses/:id` | BUYER | ลบที่อยู่ของตน |
| GET | `/api/orders` | BUYER, FARMER, ADMIN | รายการคำสั่งซื้อ; จำกัดผลตามผู้ใช้/ร้าน เว้นแต่ Admin |
| GET | `/api/orders/:id` | BUYER, FARMER, ADMIN | รายละเอียดคำสั่งซื้อตามสิทธิ์ |
| POST | `/api/orders` | BUYER | สร้างคำสั่งซื้อ |
| PATCH | `/api/orders/:id/status` | BUYER, FARMER, ADMIN | เปลี่ยนสถานะตาม ownership และ transition rules |
| GET | `/api/reviews?productId=<uuid>` | Public | รีวิวของสินค้า |
| POST | `/api/reviews` | BUYER | สร้างรีวิว (หนึ่งรายการต่อผู้ใช้/สินค้า) |
| PATCH | `/api/reviews/:id` | BUYER เจ้าของรีวิว | แก้ไขรีวิว |
| DELETE | `/api/reviews/:id` | BUYER เจ้าของรีวิว | ลบรีวิว |

ยังไม่มี User management API ที่ทำงานจริง; route `/api/users/*` เป็น placeholder ที่ตอบ 501. การจัดการ Cart ทำใน Frontend และยังไม่มี Cart API หรือการบันทึก Cart ฝั่ง Backend

## Feature status

สถานะนี้อิงจากการอ่านโค้ดและ tests ใน repository ไม่ได้หมายถึงการทดสอบ production หรือ end-to-end กับบริการภายนอก

| Feature | สถานะ | ขอบเขต/ข้อจำกัด |
| --- | --- | --- |
| Buyer signup/login และโหลด session หลัง refresh | Implemented | Access Token เก็บใน localStorage; ไม่มี refresh token rotation |
| Farmer shop registration และการอนุมัติ Admin | Implemented | ตรวจ checksum/เข้ารหัสเลขประจำตัว; ไม่ตรวจฐานข้อมูลภาครัฐ |
| Product browse/search/filter และ CRUD | Implemented | เขียน/แก้ไขได้เมื่อร้าน APPROVED และเป็นเจ้าของ |
| Product images ใน PostgreSQL | Implemented | JPEG/PNG/WEBP, สูงสุด 5 MB ต่อไฟล์; ต้องมี migration ในฐานข้อมูลเป้าหมาย |
| Category browsing และ Admin management | Implemented | ลบหมวดที่ยังมีสินค้า/หมวดลูกไม่ได้ |
| Address management | Implemented | เป็นข้อมูลของ Buyer ที่ login อยู่ |
| Cart | Partially Implemented | Zustand state ฝั่ง Frontend; ไม่ sync Backend และไม่คงอยู่หลัง refresh |
| Orders | Partially Implemented | มี API และสร้าง Payment สถานะ PENDING; ยังไม่มี gateway, webhook หรือ settlement |
| Reviews | Implemented | Buyer สร้าง/แก้ไข/ลบของตนได้; อ่านรายการเป็น public |
| Admin analytics/reporting | Not Implemented | Dashboard ปัจจุบันเป็นทางลัดไปยังงานจัดการที่รองรับ |
| Automated test coverage | Partially Implemented | มี unit/API tests; ไม่มีหลักฐานว่าได้รัน E2E ครบทุก role และ flow ในทุกสภาพแวดล้อม |

## Project structure

```text
backend/
  prisma/                 Prisma schema, migrations และ seed
  src/config/             การตั้งค่า API และ database
  src/middleware/         authentication, authorization และ error handling
  src/routes/             การลงทะเบียน API routes
  src/controllers/        HTTP handlers
  src/services/           business logic และ Prisma access
  src/validators/         validation schemas
  src/tests/              Backend tests
  prisma7.config.ts       Prisma CLI config (DIRECT_URL)
frontend/
  src/app/                App setup และ routing
  src/features/           feature modules เช่น auth, products, cart
  src/pages/               หน้าเว็บ
  src/services/            API client และ services
  src/stores/              Zustand stores
  tests/                   Frontend tests
```

## Demo and tests

สร้างบัญชี Buyer ผ่านหน้า Signup. การ Demo Farmer ต้องมีบัญชี Farmer และ `FarmerProfile` สถานะ `APPROVED`; เปิดร้านใหม่จะเริ่ม `PENDING` และต้องอนุมัติด้วย Admin ก่อน. Seed ใช้บัญชี Farmer ที่มีอยู่ `farmerdemo@gmail.com` และสร้าง/ปรับปรุงข้อมูล seed ที่มี prefix SKU `LFM-DEMO-`; ตรวจสอบฐานข้อมูลก่อนรัน โดยเฉพาะ seed ที่อาจอัปเดตแถวซึ่งมี SKU เดียวกัน. อย่ารันกับ production โดยไม่ตรวจทานผลกระทบ

```bash
# รัน tests
npm run test --workspace=backend
npm run test --workspace=frontend

# ตรวจ TypeScript และ build ทั้งโปรเจกต์
npm run typecheck
npm run build

# Prisma
npm run prisma:validate --workspace=backend
npm run prisma:generate --workspace=backend
npm run prisma:seed --workspace=backend
```

Backend tests ใช้ `node --import tsx --test`; Frontend tests ใช้ Node test runner และ `--experimental-strip-types`. Test suites ปัจจุบันครอบคลุม validation, stores และบาง API flows; ไม่ใช่การรับรองว่าเชื่อมต่อ database จริง, อัปโหลดรูปผ่าน browser หรือทำ checkout end-to-end สำเร็จในทุก environment. ตรวจผลแต่ละคำสั่งใน environment ที่กำหนดค่าครบก่อนสาธิต

## Limitations

- Cart เป็น client-side state และหายเมื่อ refresh.
- `ONLINE` เป็นวิธีชำระเงินที่รับในข้อมูลคำสั่งซื้อ แต่ไม่มี payment gateway ที่ประมวลผลเงินจริง; COD ก็ยังไม่ใช่การเชื่อมต่อขนส่ง/เก็บเงิน
- การอนุมัติร้านทำโดย Admin; checksum เลขประจำตัวไม่ได้ยืนยันตัวตนกับหน่วยงานรัฐ
- ต้อง Apply migrations ที่จำเป็นก่อนใช้ field ใหม่ เช่น image binary หรือข้อมูลยืนยันตัวตน; การรัน migration เป็นการเปลี่ยนแปลงฐานข้อมูลและควรได้รับอนุมัติตามขั้นตอนของโครงการ
