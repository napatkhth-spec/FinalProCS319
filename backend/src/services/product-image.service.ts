import { randomUUID } from 'node:crypto'
import { FarmerVerificationStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'
import { PRODUCT_IMAGE_BUCKET, getSupabaseStorageClient } from '../config/supabase.js'
import { HttpError } from '../utils/http-error.js'

const mimeExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const
type SupportedImageMime = keyof typeof mimeExtensions

export interface UploadedImageFile {
  buffer: Buffer
  mimetype: string
}

export function validateProductImageContent(file: UploadedImageFile): SupportedImageMime {
  const bytes = file.buffer
  let detected: SupportedImageMime | null = null

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) detected = 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) detected = 'image/png'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') detected = 'image/webp'

  if (!detected || detected !== file.mimetype) {
    throw new HttpError(415, 'ชนิดไฟล์รูปภาพไม่ตรงกับเนื้อหาไฟล์')
  }
  return detected
}

async function approvedFarmerId(userId: string): Promise<string> {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true, verificationStatus: true },
  })
  if (!profile || profile.verificationStatus !== FarmerVerificationStatus.APPROVED) {
    throw new HttpError(403, 'Farmer verification must be approved before managing product images')
  }
  return profile.id
}

async function assertProductOwnership(farmerId: string, productId: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { id: productId, farmerId }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Product not found')
}

function cleanupPath(farmerId: string, productId: string, path: string): string | null {
  const expectedPrefix = `farmers/${farmerId}/products/${productId}/`
  let objectPath = path
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path)
      const projectUrl = process.env.SUPABASE_URL
      if (!projectUrl || parsed.origin !== new URL(projectUrl).origin) return null
      const publicPrefix = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
      if (!parsed.pathname.startsWith(publicPrefix)) return null
      objectPath = decodeURIComponent(parsed.pathname.slice(publicPrefix.length))
    } catch {
      return null
    }
  }
  if (!objectPath.startsWith(expectedPrefix) || objectPath.split('/').some((segment) => segment === '..')) return null
  return objectPath
}

async function removeStorageObjects(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true
  try {
    const { error } = await getSupabaseStorageClient().storage.from(PRODUCT_IMAGE_BUCKET).remove(paths)
    if (error) {
      console.warn('Product image Storage cleanup did not complete')
      return false
    }
    return true
  } catch {
    console.warn('Product image Storage cleanup did not complete')
    return false
  }
}

export async function uploadProductImages(
  userId: string,
  productId: string,
  files: UploadedImageFile[],
  primaryIndex?: number,
) {
  if (files.length === 0) throw new HttpError(400, 'Select at least one image')
  if (files.some((file) => file.buffer.length > 5 * 1024 * 1024)) {
    throw new HttpError(413, 'รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อไฟล์')
  }
  if (primaryIndex !== undefined && (!Number.isInteger(primaryIndex) || primaryIndex < 0 || primaryIndex >= files.length)) {
    throw new HttpError(400, 'Invalid primary image selection')
  }

  const farmerId = await approvedFarmerId(userId)
  await assertProductOwnership(farmerId, productId)
  const verified = files.map((file) => ({ file, mime: validateProductImageContent(file) }))
  const existingImages = await prisma.productImage.findMany({
    where: { productId },
    select: { isPrimary: true },
  })
  const shouldChoosePrimary = primaryIndex !== undefined || !existingImages.some((image) => image.isPrimary)
  const storage = getSupabaseStorageClient().storage.from(PRODUCT_IMAGE_BUCKET)
  const uploaded: Array<{ path: string; publicUrl: string; mime: SupportedImageMime }> = []

  try {
    for (const { file, mime } of verified) {
      const path = `farmers/${farmerId}/products/${productId}/${randomUUID()}.${mimeExtensions[mime]}`
      const { error } = await storage.upload(path, file.buffer, { contentType: mime, cacheControl: '3600', upsert: false })
      if (error) throw new HttpError(502, 'อัปโหลดรูปไม่สำเร็จ ตรวจสอบการตั้งค่า Storage แล้วลองอีกครั้ง')
      uploaded.push({ path, publicUrl: storage.getPublicUrl(path).data.publicUrl, mime })
    }

    const images = await prisma.$transaction(async (transaction) => {
      if (shouldChoosePrimary) {
        await transaction.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
      }
      for (const [index, item] of uploaded.entries()) {
        await transaction.productImage.create({
          data: {
            productId,
            storagePath: item.publicUrl,
            isPrimary: shouldChoosePrimary && (primaryIndex === undefined ? index === 0 : index === primaryIndex),
            sortOrder: existingImages.length + index,
          },
        })
      }
      return transaction.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } })
    })
    return images
  } catch (error) {
    await removeStorageObjects(uploaded.map(({ path }) => path))
    if (error instanceof HttpError) throw error
    throw new HttpError(500, 'บันทึกข้อมูลรูปสินค้าไม่สำเร็จ และดำเนินการเก็บกวาดไฟล์ชั่วคราวแล้ว')
  }
}

async function ownedImage(userId: string, productId: string, imageId: string) {
  const farmerId = await approvedFarmerId(userId)
  await assertProductOwnership(farmerId, productId)
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } })
  if (!image) throw new HttpError(404, 'Product image not found')
  return { farmerId, image }
}

export async function setPrimaryProductImage(userId: string, productId: string, imageId: string) {
  const { image } = await ownedImage(userId, productId, imageId)
  return prisma.$transaction(async (transaction) => {
    await transaction.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
    return transaction.productImage.update({ where: { id: image.id }, data: { isPrimary: true } })
  })
}

export async function deleteProductImage(userId: string, productId: string, imageId: string) {
  const { farmerId, image } = await ownedImage(userId, productId, imageId)
  const remaining = await prisma.$transaction(async (transaction) => {
    await transaction.productImage.delete({ where: { id: image.id } })
    const images = await transaction.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } })
    if (image.isPrimary && images[0]) {
      await transaction.productImage.update({ where: { id: images[0].id }, data: { isPrimary: true } })
      images[0].isPrimary = true
    }
    return images
  })

  const referenceCount = await prisma.productImage.count({ where: { storagePath: image.storagePath } })
  const objectPath = referenceCount === 0 ? cleanupPath(farmerId, productId, image.storagePath) : null
  const storageDeleted = objectPath ? await removeStorageObjects([objectPath]) : true
  return { deletedImageId: image.id, images: remaining, storageDeleted }
}
