import { randomUUID } from 'node:crypto';
import { FarmerVerificationStatus } from '../generated/prisma/enums.js';
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

const maxImageSize = 5 * 1024 * 1024;
type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
}

const imageMetadataSelect = {
  id: true,
  productId: true,
  isPrimary: true,
  sortOrder: true,
  createdAt: true,
  mimeType: true,
  fileSize: true,
} as const;

export type ProductImageMetadata = {
  id: string;
  productId: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
  mimeType: string | null;
  fileSize: number | null;
  url: string;
};

function toMetadata(image: Omit<ProductImageMetadata, 'url'>): ProductImageMetadata {
  return { ...image, url: `/products/${image.productId}/images/${image.id}/content` };
}

export function validateProductImageContent(file: UploadedImageFile): SupportedImageMime {
  const bytes = file.buffer;
  let detected: SupportedImageMime | null = null;

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    detected = 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    detected = 'image/png';
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    detected = 'image/webp';

  if (!detected || detected !== file.mimetype) {
    throw new HttpError(415, 'ชนิดไฟล์รูปภาพไม่ตรงกับเนื้อหาไฟล์');
  }
  return detected;
}

async function approvedFarmerId(userId: string): Promise<string> {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true, verificationStatus: true },
  });
  if (!profile || profile.verificationStatus !== FarmerVerificationStatus.APPROVED) {
    throw new HttpError(403, 'Farmer verification must be approved before managing product images');
  }
  return profile.id;
}

async function assertProductOwnership(farmerId: string, productId: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, farmerId },
    select: { id: true },
  });
  if (!product) throw new HttpError(404, 'Product not found');
}

export async function uploadProductImages(
  userId: string,
  productId: string,
  files: UploadedImageFile[],
  primaryIndex?: number,
) {
  if (files.length === 0) throw new HttpError(400, 'Select at least one image');
  if (files.some((file) => file.buffer.length > maxImageSize)) {
    throw new HttpError(413, 'รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อไฟล์');
  }
  if (
    primaryIndex !== undefined &&
    (!Number.isInteger(primaryIndex) || primaryIndex < 0 || primaryIndex >= files.length)
  ) {
    throw new HttpError(400, 'Invalid primary image selection');
  }

  const farmerId = await approvedFarmerId(userId);
  await assertProductOwnership(farmerId, productId);
  const verified = files.map((file) => ({ file, mime: validateProductImageContent(file) }));
  const existingImages = await prisma.productImage.findMany({
    where: { productId },
    select: { isPrimary: true, sortOrder: true, imageData: true },
  });
  const shouldChoosePrimary =
    primaryIndex !== undefined || !existingImages.some((image) => image.imageData && image.isPrimary);
  const maxSortOrder = existingImages.reduce((max, image) => Math.max(max, image.sortOrder), -1);

  const images = await prisma.$transaction(async (transaction) => {
    if (shouldChoosePrimary) {
      await transaction.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    }
    for (const [index, item] of verified.entries()) {
      const id = randomUUID();
      await transaction.productImage.create({
        data: {
          id,
          productId,
          // Retained for backward compatibility with rows predating binary image storage.
          storagePath: `/products/${productId}/images/${id}/content`,
          imageData: Uint8Array.from(item.file.buffer),
          mimeType: item.mime,
          fileSize: item.file.buffer.length,
          isPrimary:
            shouldChoosePrimary && (primaryIndex === undefined ? index === 0 : index === primaryIndex),
          sortOrder: maxSortOrder + 1 + index,
        },
      });
    }
    return transaction.productImage.findMany({
      where: { productId, imageData: { not: null } },
      orderBy: { sortOrder: 'asc' },
      select: imageMetadataSelect,
    });
  });
  return images.map(toMetadata);
}

async function ownedImage(userId: string, productId: string, imageId: string) {
  const farmerId = await approvedFarmerId(userId);
  await assertProductOwnership(farmerId, productId);
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
    select: { id: true, isPrimary: true },
  });
  if (!image) throw new HttpError(404, 'Product image not found');
  return image;
}

export async function getProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId, imageData: { not: null }, product: { status: { not: 'INACTIVE' } } },
    select: { imageData: true, mimeType: true, fileSize: true },
  });
  if (!image?.imageData || !image.mimeType) throw new HttpError(404, 'Product image not found');
  return {
    imageData: image.imageData,
    mimeType: image.mimeType,
    fileSize: image.fileSize ?? image.imageData.length,
  };
}

export async function setPrimaryProductImage(userId: string, productId: string, imageId: string) {
  const image = await ownedImage(userId, productId, imageId);
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    return transaction.productImage.update({
      where: { id: image.id },
      data: { isPrimary: true },
      select: imageMetadataSelect,
    });
  });
  return toMetadata(updated);
}

export async function deleteProductImage(userId: string, productId: string, imageId: string) {
  const image = await ownedImage(userId, productId, imageId);
  const remaining = await prisma.$transaction(async (transaction) => {
    await transaction.productImage.delete({ where: { id: image.id } });
    const images = await transaction.productImage.findMany({
      where: { productId, imageData: { not: null } },
      orderBy: { sortOrder: 'asc' },
      select: imageMetadataSelect,
    });
    if (image.isPrimary && images[0]) {
      await transaction.productImage.update({ where: { id: images[0].id }, data: { isPrimary: true } });
      images[0].isPrimary = true;
    }
    return images;
  });
  return { deletedImageId: image.id, images: remaining.map(toMetadata) };
}
