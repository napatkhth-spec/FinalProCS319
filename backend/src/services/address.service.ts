import { prisma } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';
import type { CreateAddressInput, UpdateAddressInput } from '../validators/address.validator.js';

export function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new HttpError(404, 'Address not found');
  return address;
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  const { isDefault = false, ...fields } = input;
  return prisma.$transaction(async (transaction) => {
    if (isDefault) await transaction.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return transaction.address.create({ data: { ...fields, isDefault, userId } });
  });
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.address.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'Address not found');
    if (input.isDefault === true)
      await transaction.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    return transaction.address.update({ where: { id }, data: input });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const result = await prisma.address.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new HttpError(404, 'Address not found');
}
