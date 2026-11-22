import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProductStatus } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const farmerEmail = 'farmerdemo@gmail.com';
const seedSkuPrefix = 'LFM-DEMO-';

const categories = [
  { name: 'ผลไม้', description: 'ผลไม้สดตามฤดูกาลจากเกษตรกรไทย' },
  { name: 'ผักสด', description: 'ผักสดสำหรับประกอบอาหาร เก็บเกี่ยวใหม่' },
  { name: 'ข้าวและธัญพืช', description: 'ข้าวและธัญพืชจากแหล่งเพาะปลูกในประเทศ' },
  { name: 'เนื้อสัตว์', description: 'เนื้อสัตว์จากฟาร์มที่ใส่ใจคุณภาพ' },
  { name: 'ไข่ไก่', description: 'ไข่ไก่สดจากฟาร์มในท้องถิ่น' },
  { name: 'อาหารแปรรูป', description: 'อาหารแปรรูปและของถนอมอาหารจากผลผลิตชุมชน' },
  { name: 'สมุนไพร', description: 'สมุนไพรและเครื่องเทศสดจากสวน' },
  { name: 'สินค้าเกษตรอินทรีย์', description: 'ผลผลิตที่ปลูกโดยเน้นวิธีเกษตรอินทรีย์' },
  { name: 'ผลิตภัณฑ์จากสวน', description: 'ผลิตภัณฑ์จากผลผลิตทางการเกษตร' },
];

const products = [
  {
    sku: 'FRUIT-001',
    name: 'ทุเรียนหมอนทอง',
    description: 'ทุเรียนหมอนทองเนื้อหนา หอมหวาน คัดจากสวนจังหวัดจันทบุรี',
    price: '185.00',
    stock: 24,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-002',
    name: 'มังคุดคัดเกรด',
    description: 'มังคุดเปลือกสวย เนื้อขาวหวานอมเปรี้ยว เก็บสดตามฤดูกาล',
    price: '75.00',
    stock: 48,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-003',
    name: 'เงาะโรงเรียน',
    description: 'เงาะโรงเรียนเนื้อกรอบหวาน ปอกง่ายจากสวนระยอง',
    price: '52.00',
    stock: 35,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-004',
    name: 'ลำไยสด',
    description: 'ลำไยเนื้อหนาเมล็ดเล็ก หวานหอมจากสวนภาคเหนือ',
    price: '68.00',
    stock: 42,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-005',
    name: 'มะม่วงน้ำดอกไม้',
    description: 'มะม่วงน้ำดอกไม้สุกหอม เนื้อละเอียด เหมาะรับประทานสด',
    price: '89.00',
    stock: 31,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-006',
    name: 'มะพร้าวน้ำหอม',
    description: 'มะพร้าวน้ำหอมสด น้ำหวาน เนื้อนุ่มจากสวนราชบุรี',
    price: '35.00',
    stock: 60,
    unit: 'ลูก',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-007',
    name: 'กล้วยหอมทอง',
    description: 'กล้วยหอมทองสุกกำลังดี ปลูกแบบธรรมชาติ',
    price: '45.00',
    stock: 28,
    unit: 'หวี',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-008',
    name: 'สับปะรดภูแล',
    description: 'สับปะรดภูแลลูกเล็ก หวานกรอบ รับประทานได้ทั้งแกน',
    price: '55.00',
    stock: 37,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-009',
    name: 'ฝรั่งกิมจู',
    description: 'ฝรั่งกิมจูผลใหญ่ เนื้อแน่นกรอบ สดจากสวน',
    price: '42.00',
    stock: 50,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'FRUIT-010',
    name: 'ส้มเขียวหวาน',
    description: 'ส้มเขียวหวานเปลือกบาง รสหวานอมเปรี้ยว',
    price: '63.00',
    stock: 33,
    unit: 'กิโลกรัม',
    category: 'ผลไม้',
  },
  {
    sku: 'VEG-001',
    name: 'ผักคะน้าปลอดสาร',
    description: 'คะน้าก้านกรอบ ใบเขียว เก็บเช้าวันจัดส่ง',
    price: '38.00',
    stock: 26,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-002',
    name: 'ผักบุ้งจีน',
    description: 'ผักบุ้งจีนยอดอ่อน สดกรอบ เหมาะผัดไฟแดง',
    price: '25.00',
    stock: 44,
    unit: 'กำ',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-003',
    name: 'กวางตุ้งฮ่องเต้',
    description: 'กวางตุ้งฮ่องเต้ใบอ่อน ก้านหวาน ปลูกในแปลงเปิด',
    price: '32.00',
    stock: 39,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-004',
    name: 'มะเขือเทศสีดา',
    description: 'มะเขือเทศสีดาสด รสเปรี้ยวหวาน เหมาะทำส้มตำและแกง',
    price: '40.00',
    stock: 29,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-005',
    name: 'แตงกวาสด',
    description: 'แตงกวาผลตรง เนื้อฉ่ำน้ำ จากแปลงผักชุมชน',
    price: '28.00',
    stock: 54,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-006',
    name: 'ฟักทองญี่ปุ่น',
    description: 'ฟักทองเนื้อแน่น หวานมัน เหมาะนึ่งและทำซุป',
    price: '48.00',
    stock: 21,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-007',
    name: 'ข้าวโพดหวาน',
    description: 'ข้าวโพดหวานฝักใหญ่ เก็บสดใหม่จากไร่',
    price: '12.00',
    stock: 80,
    unit: 'ฝัก',
    category: 'ผักสด',
  },
  {
    sku: 'VEG-008',
    name: 'แครอทปลอดภัย',
    description: 'แครอทหัวแน่น สีสวย ปลูกด้วยการดูแลอย่างใส่ใจ',
    price: '52.00',
    stock: 25,
    unit: 'กิโลกรัม',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'VEG-009',
    name: 'ผักสลัดกรีนโอ๊ก',
    description: 'ผักสลัดใบกรอบ ปลูกในโรงเรือนและล้างสะอาด',
    price: '65.00',
    stock: 18,
    unit: 'กิโลกรัม',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'VEG-010',
    name: 'เห็ดนางฟ้าสด',
    description: 'เห็ดนางฟ้าดอกสวย เนื้อแน่น เก็บใหม่ทุกวัน',
    price: '58.00',
    stock: 22,
    unit: 'กิโลกรัม',
    category: 'ผักสด',
  },
  {
    sku: 'RICE-001',
    name: 'ข้าวหอมมะลิใหม่',
    description: 'ข้าวหอมมะลิฤดูกาลใหม่ สีข้าวสด หุงขึ้นหม้อ',
    price: '58.00',
    stock: 120,
    unit: 'กิโลกรัม',
    category: 'ข้าวและธัญพืช',
  },
  {
    sku: 'RICE-002',
    name: 'ข้าวไรซ์เบอร์รี',
    description: 'ข้าวไรซ์เบอร์รีสีธรรมชาติ คัดเมล็ดเต็มจากนาขนาดเล็ก',
    price: '95.00',
    stock: 46,
    unit: 'กิโลกรัม',
    category: 'ข้าวและธัญพืช',
  },
  {
    sku: 'RICE-003',
    name: 'ข้าวเหนียวเขี้ยวงู',
    description: 'ข้าวเหนียวเขี้ยวงูเมล็ดเรียว นึ่งนุ่ม หอมเป็นพิเศษ',
    price: '72.00',
    stock: 53,
    unit: 'กิโลกรัม',
    category: 'ข้าวและธัญพืช',
  },
  {
    sku: 'RICE-004',
    name: 'ถั่วเขียวคัดพิเศษ',
    description: 'ถั่วเขียวเมล็ดเต็ม สะอาด เหมาะทำขนมและเพาะถั่วงอก',
    price: '64.00',
    stock: 38,
    unit: 'กิโลกรัม',
    category: 'ข้าวและธัญพืช',
  },
  {
    sku: 'RICE-005',
    name: 'ข้าวโพดเลี้ยงสัตว์',
    description: 'เมล็ดข้าวโพดแห้งจากไร่ เก็บรักษาในที่แห้งสะอาด',
    price: '18.00',
    stock: 200,
    unit: 'กิโลกรัม',
    category: 'ข้าวและธัญพืช',
  },
  {
    sku: 'MEAT-001',
    name: 'อกไก่สดจากฟาร์ม',
    description: 'อกไก่สดแช่เย็นจากฟาร์มในชุมชน บรรจุสะอาด',
    price: '105.00',
    stock: 16,
    unit: 'กิโลกรัม',
    category: 'เนื้อสัตว์',
  },
  {
    sku: 'MEAT-002',
    name: 'หมูสามชั้นสด',
    description: 'หมูสามชั้นสดใหม่ คัดชิ้นพอดีสำหรับทำอาหาร',
    price: '185.00',
    stock: 12,
    unit: 'กิโลกรัม',
    category: 'เนื้อสัตว์',
  },
  {
    sku: 'MEAT-003',
    name: 'เนื้อวัวพื้นบ้าน',
    description: 'เนื้อวัวจากฟาร์มขนาดเล็ก สั่งตัดและแพ็กแช่เย็น',
    price: '265.00',
    stock: 9,
    unit: 'กิโลกรัม',
    category: 'เนื้อสัตว์',
  },
  {
    sku: 'MEAT-004',
    name: 'ปลานิลสด',
    description: 'ปลานิลเลี้ยงในบ่อสะอาด เนื้อแน่น สดจากฟาร์ม',
    price: '82.00',
    stock: 20,
    unit: 'กิโลกรัม',
    category: 'เนื้อสัตว์',
  },
  {
    sku: 'EGG-001',
    name: 'ไข่ไก่สด เบอร์ 1',
    description: 'ไข่ไก่สดคละแพ็กจากฟาร์ม เลือกใช้ได้หลากหลายเมนู',
    price: '145.00',
    stock: 34,
    unit: 'แผง',
    category: 'ไข่ไก่',
  },
  {
    sku: 'EGG-002',
    name: 'ไข่เป็ดสด',
    description: 'ไข่เป็ดสดเปลือกสะอาด เหมาะทำไข่เค็มและอาหารคาว',
    price: '68.00',
    stock: 27,
    unit: '10 ฟอง',
    category: 'ไข่ไก่',
  },
  {
    sku: 'EGG-003',
    name: 'ไข่ไก่อารมณ์ดี',
    description: 'ไข่ไก่จากแม่ไก่เลี้ยงแบบปล่อยในพื้นที่โปร่ง',
    price: '175.00',
    stock: 19,
    unit: 'แผง',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'PROC-001',
    name: 'กล้วยตากอบพลังงานแสงอาทิตย์',
    description: 'กล้วยน้ำว้าสุกตากแห้งแบบธรรมชาติ ไม่เติมน้ำตาล',
    price: '85.00',
    stock: 32,
    unit: 'ถุง',
    category: 'อาหารแปรรูป',
  },
  {
    sku: 'PROC-002',
    name: 'น้ำผึ้งดอกลำไย',
    description: 'น้ำผึ้งแท้จากดอกลำไย เก็บจากชุมชนผู้เลี้ยงผึ้ง',
    price: '220.00',
    stock: 14,
    unit: 'ขวด',
    category: 'อาหารแปรรูป',
  },
  {
    sku: 'PROC-003',
    name: 'มะม่วงกวนโฮมเมด',
    description: 'มะม่วงกวนจากผลไม้สุกในสวน รสเปรี้ยวหวาน',
    price: '95.00',
    stock: 25,
    unit: 'ห่อ',
    category: 'อาหารแปรรูป',
  },
  {
    sku: 'PROC-004',
    name: 'ข้าวแต๋นน้ำแตงโม',
    description: 'ข้าวแต๋นทำจากข้าวเหนียวชุมชน ราดน้ำอ้อยหอมหวาน',
    price: '65.00',
    stock: 41,
    unit: 'แพ็ก',
    category: 'อาหารแปรรูป',
  },
  {
    sku: 'PROC-005',
    name: 'กล้วยฉาบรสธรรมชาติ',
    description: 'กล้วยฉาบกรอบบาง ทอดใหม่จากกล้วยในสวน',
    price: '55.00',
    stock: 36,
    unit: 'ถุง',
    category: 'อาหารแปรรูป',
  },
  {
    sku: 'HERB-001',
    name: 'ตะไคร้สด',
    description: 'ตะไคร้หอมสดจากสวน เหมาะทำต้มยำและเครื่องแกง',
    price: '30.00',
    stock: 47,
    unit: 'กิโลกรัม',
    category: 'สมุนไพร',
  },
  {
    sku: 'HERB-002',
    name: 'ข่าอ่อน',
    description: 'ข่าอ่อนกลิ่นหอม เนื้อนุ่ม สำหรับปรุงอาหารไทย',
    price: '42.00',
    stock: 23,
    unit: 'กิโลกรัม',
    category: 'สมุนไพร',
  },
  {
    sku: 'HERB-003',
    name: 'ใบกะเพรา',
    description: 'ใบกะเพราหอมสด เก็บเช้า เหมาะผัดและทำแกง',
    price: '20.00',
    stock: 40,
    unit: 'กำ',
    category: 'สมุนไพร',
  },
  {
    sku: 'HERB-004',
    name: 'ขมิ้นชันสด',
    description: 'ขมิ้นชันหัวสด สีเหลืองเข้ม สำหรับอาหารและเครื่องดื่ม',
    price: '75.00',
    stock: 17,
    unit: 'กิโลกรัม',
    category: 'สมุนไพร',
  },
  {
    sku: 'ORGANIC-001',
    name: 'มะนาวแป้นอินทรีย์',
    description: 'มะนาวแป้นเปลือกบาง ปลูกโดยไม่ใช้สารเคมีสังเคราะห์',
    price: '8.00',
    stock: 100,
    unit: 'ลูก',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'ORGANIC-002',
    name: 'หอมแดงปลอดสาร',
    description: 'หอมแดงหัวแน่น ตากแห้งพอดี เก็บรักษาได้นาน',
    price: '78.00',
    stock: 30,
    unit: 'กิโลกรัม',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'ORGANIC-003',
    name: 'กระเทียมไทยอินทรีย์',
    description: 'กระเทียมไทยกลิ่นหอมจากแปลงเกษตรอินทรีย์',
    price: '115.00',
    stock: 26,
    unit: 'กิโลกรัม',
    category: 'สินค้าเกษตรอินทรีย์',
  },
  {
    sku: 'GARDEN-001',
    name: 'น้ำมันมะพร้าวสกัดเย็น',
    description: 'น้ำมันมะพร้าวสกัดเย็นจากมะพร้าวน้ำหอมในพื้นที่',
    price: '180.00',
    stock: 15,
    unit: 'ขวด',
    category: 'ผลิตภัณฑ์จากสวน',
  },
  {
    sku: 'GARDEN-002',
    name: 'เมล็ดพันธุ์ผักพื้นบ้าน',
    description: 'ชุดเมล็ดพันธุ์ผักพื้นบ้าน คัดและเก็บจากแปลงชุมชน',
    price: '49.00',
    stock: 65,
    unit: 'ชุด',
    category: 'ผลิตภัณฑ์จากสวน',
  },
  {
    sku: 'GARDEN-003',
    name: 'ปุ๋ยหมักมูลไส้เดือน',
    description: 'ปุ๋ยอินทรีย์จากมูลไส้เดือน เหมาะสำหรับแปลงผักและไม้กระถาง',
    price: '89.00',
    stock: 28,
    unit: 'ถุง',
    category: 'ผลิตภัณฑ์จากสวน',
  },
];

async function main() {
  // Validate the existing demo account before making any database changes.
  const farmerUser = await prisma.user.findUnique({
    where: { email: farmerEmail },
    select: { id: true, farmerProfile: { select: { id: true, verificationStatus: true } } },
  });
  if (!farmerUser)
    throw new Error(`Required demo farmer account not found: ${farmerEmail}. No data was changed.`);
  if (!farmerUser.farmerProfile || farmerUser.farmerProfile.verificationStatus !== 'APPROVED') {
    throw new Error(
      `Demo farmer ${farmerEmail} does not have an APPROVED FarmerProfile. No data was changed.`,
    );
  }

  const categoryIds = new Map<string, string>();
  let createdCategories = 0;
  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { name: category.name },
      select: { id: true },
    });
    const saved = existing ?? (await prisma.category.create({ data: category, select: { id: true } }));
    if (!existing) createdCategories += 1;
    categoryIds.set(category.name, saved.id);
  }

  let createdProducts = 0;
  let updatedSeedProducts = 0;
  for (const product of products) {
    const sku = `${seedSkuPrefix}${product.sku}`;
    const existing = await prisma.product.findUnique({
      where: { sku },
      select: { id: true, farmerId: true },
    });
    if (existing && existing.farmerId !== farmerUser.farmerProfile.id) {
      throw new Error(`Seed SKU ${sku} belongs to a different farmer. No product was changed.`);
    }
    const data = {
      farmerId: farmerUser.farmerProfile.id,
      categoryId: categoryIds.get(product.category)!,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      status: ProductStatus.ACTIVE,
    };
    await prisma.product.upsert({
      where: { sku },
      create: { ...data, sku },
      update: data,
    });
    if (existing) updatedSeedProducts += 1;
    else createdProducts += 1;
  }

  console.info(
    `Seed complete: ${createdCategories} categories created (${categories.length} available); ${createdProducts} products created; ${updatedSeedProducts} seed products refreshed; farmer=${farmerEmail}.`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
