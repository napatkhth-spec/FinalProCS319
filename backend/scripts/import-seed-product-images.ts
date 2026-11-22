import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/config/database.js';

const maxImageSize = 5 * 1024 * 1024;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const assetsDirectory = join(scriptDirectory, '../assets/product-images');
const markerPrefix = 'seed-assets/';

interface ProductImageJob {
  sku: string;
  name: string;
  out: string;
  prompt: string;
}

interface PreparedImport {
  job: ProductImageJob;
  productId: string;
  imageData: Buffer;
  storagePath: string;
  sortOrder: number;
  isPrimary: boolean;
  alreadyImported: boolean;
}

function assertJpeg(file: Buffer, fileName: string): void {
  if (file.length < 3 || file[0] !== 0xff || file[1] !== 0xd8 || file[2] !== 0xff) {
    throw new Error(`${fileName} does not have a JPEG signature.`);
  }
  if (file.length > maxImageSize) {
    throw new Error(`${fileName} exceeds the 5 MB image limit.`);
  }
}

async function main(): Promise<void> {
  const jobsText = await readFile(join(assetsDirectory, 'jobs.jsonl'), 'utf8');
  const jobs = jobsText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProductImageJob);

  if (jobs.length === 0) throw new Error('No product image jobs were found.');
  if (new Set(jobs.map((job) => job.sku)).size !== jobs.length) {
    throw new Error('The product image manifest contains duplicate SKUs.');
  }
  if (jobs.some((job) => basename(job.out) !== job.out || !job.out.toLowerCase().endsWith('.jpg'))) {
    throw new Error('Image output names must be simple .jpg filenames.');
  }

  const products = await prisma.product.findMany({
    where: { sku: { in: jobs.map((job) => job.sku) } },
    select: {
      id: true,
      sku: true,
      name: true,
      images: {
        select: { id: true, storagePath: true, isPrimary: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const prepared: PreparedImport[] = [];

  for (const job of jobs) {
    const product = productsBySku.get(job.sku);
    if (!product) throw new Error(`No Product row exists for seed SKU ${job.sku}.`);
    if (product.name !== job.name) {
      throw new Error(`Product name mismatch for ${job.sku}: expected ${job.name}, found ${product.name}.`);
    }

    const imageData = await readFile(join(assetsDirectory, job.out));
    assertJpeg(imageData, job.out);
    const storagePath = `${markerPrefix}${job.sku}.jpg`;
    const alreadyImported = product.images.some((image) => image.storagePath === storagePath);
    const maxSortOrder = product.images.reduce((max, image) => Math.max(max, image.sortOrder), -1);

    prepared.push({
      job,
      productId: product.id,
      imageData,
      storagePath,
      sortOrder: maxSortOrder + 1,
      isPrimary: !product.images.some((image) => image.isPrimary),
      alreadyImported,
    });
  }

  const toCreate = prepared.filter((item) => !item.alreadyImported);
  const existingCount = prepared.length - toCreate.length;
  console.info(
    `Preflight: ${prepared.length} products matched; ${toCreate.length} image(s) ready; ${existingCount} already imported; max image size 5 MB.`,
  );
  console.info(
    `Sample: ${
      toCreate
        .slice(0, 5)
        .map(({ job }) => `${job.sku} → ${job.name} (${job.out})`)
        .join(' | ') || 'no new images'
    }`,
  );

  if (!process.argv.includes('--apply')) {
    console.info('Dry run only. Add --apply after reviewing the report to write images to PostgreSQL.');
    return;
  }

  let importedCount = 0;
  for (const item of toCreate) {
    const created = await prisma.productImage.create({
      data: {
        productId: item.productId,
        storagePath: item.storagePath,
        imageData: Uint8Array.from(item.imageData),
        mimeType: 'image/jpeg',
        fileSize: item.imageData.length,
        isPrimary: item.isPrimary,
        sortOrder: item.sortOrder,
      },
      select: { id: true, productId: true, imageData: true, mimeType: true, fileSize: true, isPrimary: true },
    });

    if (
      created.productId !== item.productId ||
      created.mimeType !== 'image/jpeg' ||
      created.fileSize !== item.imageData.length ||
      !Buffer.from(created.imageData ?? []).equals(item.imageData)
    ) {
      throw new Error(`Database read-back validation failed for ${item.job.sku}.`);
    }
    importedCount += 1;
  }

  console.info(
    `Import complete: ${importedCount} image(s) inserted; ${existingCount} existing seed image(s) left unchanged.`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Product image import failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
