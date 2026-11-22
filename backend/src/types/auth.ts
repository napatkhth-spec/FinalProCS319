import type { AppRole, FarmerVerificationStatus } from '../generated/prisma/enums.js';

export interface FarmerProfileSummary {
  id: string;
  shopName: string;
  description: string | null;
  farmAddress: string | null;
  province: string | null;
  profileImage: string | null;
  verificationStatus: FarmerVerificationStatus;
}

export interface AuthenticatedAppUser {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
  farmerProfile: FarmerProfileSummary | null;
}

export interface AuthTokens {
  accessToken: string;
  user: AuthenticatedAppUser;
}
