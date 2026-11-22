import { randomUUID } from 'node:crypto';
import { AppRole } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/database.js';
import { hashPassword, signAccessToken, verifyPassword } from '../utils/auth-crypto.js';
import type { AuthenticatedAppUser, AuthTokens } from '../types/auth.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';
import { HttpError } from '../utils/http-error.js';

const authUserInclude = {
  roles: { select: { role: true } },
  farmerProfile: {
    select: {
      id: true,
      shopName: true,
      description: true,
      farmAddress: true,
      province: true,
      profileImage: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.UserInclude;

type UserWithAuth = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

function toAppUser(user: UserWithAuth): AuthenticatedAppUser {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    roles: user.roles.map(({ role }) => role),
    farmerProfile: user.farmerProfile,
  };
}

function genericCredentialsError(): HttpError {
  return new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
}

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(
      async (transaction) => {
        const duplicate = await transaction.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true },
        });
        if (duplicate) return;

        await transaction.user.create({
          data: {
            id: randomUUID(),
            email,
            fullName: input.fullName.trim(),
            passwordHash,
            roles: { create: { role: AppRole.BUYER } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && String(error.code) === 'P2002')
      return;
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: authUserInclude,
  });
  const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? null);
  if (!user || !passwordValid || !user.isActive) throw genericCredentialsError();

  return {
    accessToken: await signAccessToken(user.id),
    user: toAppUser(user),
  };
}

export async function loadAuthenticatedUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: authUserInclude });
  if (!user || !user.isActive) throw genericCredentialsError();
  return toAppUser(user);
}
