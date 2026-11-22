import { AppRole, FarmerVerificationStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'
import type { CreateFarmerProfileInput, UpdateFarmerProfileInput } from '../validators/farmer.validator.js'
import { HttpError } from '../utils/http-error.js'

export async function createFarmerProfile(userId: string, input: CreateFarmerProfileInput) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new HttpError(404, 'Account setup is required before opening a shop')

    const farmerProfile = await transaction.farmerProfile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: {},
    })

    await transaction.userRoleAssignment.upsert({
      where: { userId_role: { userId, role: AppRole.FARMER } },
      create: { userId, role: AppRole.FARMER },
      update: {},
    })

    const roles = await transaction.userRoleAssignment.findMany({
      where: { userId },
      select: { role: true },
      orderBy: { createdAt: 'asc' },
    })

    return { farmerProfile, roles: roles.map(({ role }) => role) }
  })
}

export async function getFarmerProfile(userId: string) {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    include: { _count: { select: { products: true, orders: true } } },
  })
  if (!profile) throw new HttpError(404, 'Farmer profile not found')
  return profile
}

export async function updateFarmerProfile(userId: string, input: UpdateFarmerProfileInput) {
  const profile = await prisma.farmerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) throw new HttpError(404, 'Farmer profile not found')
  return prisma.farmerProfile.update({
    where: { userId },
    data: input,
  })
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
} as const

export async function listPendingFarmerProfiles() {
  return prisma.farmerProfile.findMany({
    where: { verificationStatus: FarmerVerificationStatus.PENDING },
    select: farmerReviewSelect,
    orderBy: { createdAt: 'asc' },
  })
}

export async function approveFarmerProfile(profileId: string) {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.farmerProfile.updateMany({
      where: { id: profileId, verificationStatus: FarmerVerificationStatus.PENDING },
      data: { verificationStatus: FarmerVerificationStatus.APPROVED },
    })

    if (result.count !== 1) {
      const profile = await transaction.farmerProfile.findUnique({ where: { id: profileId }, select: { verificationStatus: true } })
      if (!profile) throw new HttpError(404, 'Farmer application not found')
      throw new HttpError(409, 'Farmer application is no longer pending')
    }

    return transaction.farmerProfile.findUniqueOrThrow({ where: { id: profileId }, select: farmerReviewSelect })
  })
}
