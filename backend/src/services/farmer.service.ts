import { Prisma } from '../generated/prisma/client.js';
import { AppRole, FarmerVerificationStatus } from '../generated/prisma/enums.js';
import { prisma } from '../config/database.js';
import type { CreateFarmerProfileInput, UpdateFarmerProfileInput } from '../validators/farmer.validator.js';
import { encryptNationalId, hashNationalId } from '../utils/farmer-identity.js';
import { HttpError } from '../utils/http-error.js';

const publicProfileSelect = {
  id: true,
  userId: true,
  shopName: true,
  contactPhone: true,
  description: true,
  farmAddress: true,
  province: true,
  profileImage: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeShopName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function isUniqueConstraintError(error: unknown): error is { code: string; meta?: { target?: unknown } } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function mapUniqueConstraintError(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    const target = String(error.meta?.target ?? '');
    if (target.includes('nationalIdHash') || target.includes('national_id_hash')) {
      throw new HttpError(409, 'เลขบัตรประชาชนนี้ถูกใช้ลงทะเบียนเปิดร้านค้าแล้ว');
    }
    if (target.includes('shopName') || target.includes('shop_name_normalized')) {
      throw new HttpError(409, 'ชื่อร้านค้านี้ถูกใช้งานแล้ว');
    }
    if (target.includes('userId')) {
      throw new HttpError(409, 'บัญชีนี้มีร้านค้าอยู่แล้ว ไม่สามารถเปิดร้านค้าเพิ่มได้');
    }
  }
  throw error;
}

export async function createFarmerProfile(userId: string, input: CreateFarmerProfileInput) {
  const shopName = normalizeShopName(input.shopName);
  const contactPhone = input.contactPhone;

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) throw new HttpError(404, 'Account setup is required before opening a shop');

        const existingProfile = await transaction.farmerProfile.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (existingProfile) {
          throw new HttpError(409, 'บัญชีนี้มีร้านค้าอยู่แล้ว ไม่สามารถเปิดร้านค้าเพิ่มได้');
        }

        const duplicateName = await transaction.$queryRaw<Array<{ exists: boolean }>>(
          Prisma.sql`
          SELECT EXISTS (
            SELECT 1 FROM "farmer_profiles"
            WHERE lower(regexp_replace(btrim("shopName"), '[[:space:]]+', ' ', 'g')) = lower(${shopName})
          ) AS "exists"
        `,
        );
        if (duplicateName[0]?.exists) throw new HttpError(409, 'ชื่อร้านค้านี้ถูกใช้งานแล้ว');

        const { nationalId, ...profileInput } = input;
        const nationalIdHash = hashNationalId(nationalId);
        const existingNationalId = await transaction.farmerProfile.findFirst({
          where: { nationalIdHash },
          select: { id: true },
        });
        if (existingNationalId) {
          throw new HttpError(409, 'เลขบัตรประชาชนนี้ถูกใช้ลงทะเบียนเปิดร้านค้าแล้ว');
        }

        const farmerProfile = await transaction.farmerProfile.create({
          data: {
            userId,
            ...profileInput,
            shopName,
            contactPhone,
            nationalIdHash,
            nationalIdCiphertext: encryptNationalId(nationalId),
          },
          select: publicProfileSelect,
        });

        await transaction.userRoleAssignment.upsert({
          where: { userId_role: { userId, role: AppRole.FARMER } },
          create: { userId, role: AppRole.FARMER },
          update: {},
        });

        const roles = await transaction.userRoleAssignment.findMany({
          where: { userId },
          select: { role: true },
          orderBy: { createdAt: 'asc' },
        });

        return { farmerProfile, roles: roles.map(({ role }) => role) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}

export async function getFarmerProfile(userId: string) {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: {
      ...publicProfileSelect,
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!profile) throw new HttpError(404, 'Farmer profile not found');
  return profile;
}

export async function updateFarmerProfile(userId: string, input: UpdateFarmerProfileInput) {
  const profile = await prisma.farmerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new HttpError(404, 'Farmer profile not found');
  try {
    return await prisma.farmerProfile.update({
      where: { userId },
      data: {
        ...input,
        ...(input.shopName ? { shopName: normalizeShopName(input.shopName) } : {}),
      },
      select: publicProfileSelect,
    });
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}

const farmerReviewSelect = {
  id: true,
  shopName: true,
  description: true,
  farmAddress: true,
  profileImage: true,
  verificationStatus: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
} as const;

export async function listPendingFarmerProfiles() {
  return prisma.farmerProfile.findMany({
    where: { verificationStatus: FarmerVerificationStatus.PENDING },
    select: farmerReviewSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function approveFarmerProfile(profileId: string) {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.farmerProfile.updateMany({
      where: { id: profileId, verificationStatus: FarmerVerificationStatus.PENDING },
      data: { verificationStatus: FarmerVerificationStatus.APPROVED },
    });

    if (result.count !== 1) {
      const profile = await transaction.farmerProfile.findUnique({
        where: { id: profileId },
        select: { verificationStatus: true },
      });
      if (!profile) throw new HttpError(404, 'Farmer application not found');
      throw new HttpError(409, 'Farmer application is no longer pending');
    }

    return transaction.farmerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: farmerReviewSelect,
    });
  });
}
