import { AppRole, FarmerVerificationStatus, Prisma } from '../src/generated/prisma/client.js'
import { prisma } from '../src/config/database.js'

type Mode = 'check' | 'apply'
interface Options {
  mode: Mode
  adminEmail: string
  farmerEmail: string
}

class ProvisioningError extends Error {}

function parseOptions(args: string[]): Options {
  let mode: Mode | undefined
  let adminEmail: string | undefined
  let farmerEmail: string | undefined
  let confirmed = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--check' || argument === '--apply') {
      if (mode) throw new ProvisioningError('Choose exactly one mode: --check or --apply.')
      mode = argument.slice(2) as Mode
      continue
    }
    if (argument === '--admin-email' || argument === '--farmer-email') {
      const email = args[index + 1]?.trim().toLowerCase()
      if (!email || email.startsWith('--') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ProvisioningError(`A valid value is required for ${argument}.`)
      }
      if (argument === '--admin-email') {
        if (adminEmail) throw new ProvisioningError('--admin-email may only be provided once.')
        adminEmail = email
      } else {
        if (farmerEmail) throw new ProvisioningError('--farmer-email may only be provided once.')
        farmerEmail = email
      }
      index += 1
      continue
    }
    if (argument === '--confirm-demo-provisioning') {
      if (confirmed) throw new ProvisioningError('--confirm-demo-provisioning may only be provided once.')
      confirmed = true
      continue
    }
    throw new ProvisioningError('Unrecognized command-line option.')
  }

  if (!mode || !adminEmail || !farmerEmail) {
    throw new ProvisioningError('Provide a mode and both --admin-email and --farmer-email targets.')
  }
  if (adminEmail === farmerEmail) {
    throw new ProvisioningError('Admin Demo and Farmer Demo must be different accounts.')
  }
  if (mode === 'apply' && !confirmed) {
    throw new ProvisioningError('Apply mode requires --confirm-demo-provisioning.')
  }
  if (mode === 'check' && confirmed) {
    throw new ProvisioningError('Do not use --confirm-demo-provisioning with --check.')
  }

  return { mode, adminEmail, farmerEmail }
}

type Transaction = Prisma.TransactionClient

async function findRegisteredAccount(transaction: Transaction, email: string) {
  const account = await transaction.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      isActive: true,
      passwordHash: true,
      roles: { select: { role: true } },
      farmerProfile: { select: { id: true, verificationStatus: true } },
    },
  })
  if (!account || !account.passwordHash || !account.isActive || !account.roles.some(({ role }) => role === AppRole.BUYER)) {
    throw new ProvisioningError('A target account is missing, inactive, or was not registered through the supported flow.')
  }
  return account
}

async function provision(options: Options): Promise<string[]> {
  return prisma.$transaction(async (transaction) => {
    // Resolve both targets and validate every precondition before performing either write.
    const adminAccount = await findRegisteredAccount(transaction, options.adminEmail)
    const farmerAccount = await findRegisteredAccount(transaction, options.farmerEmail)
    if (adminAccount.id === farmerAccount.id) {
      throw new ProvisioningError('Admin Demo and Farmer Demo resolved to the same account.')
    }

    if (!farmerAccount.roles.some(({ role }) => role === AppRole.FARMER) || !farmerAccount.farmerProfile) {
      throw new ProvisioningError('Farmer Demo must already have the FARMER role and a FarmerProfile.')
    }
    const farmerStatus = farmerAccount.farmerProfile.verificationStatus
    if (farmerStatus !== FarmerVerificationStatus.PENDING && farmerStatus !== FarmerVerificationStatus.APPROVED) {
      throw new ProvisioningError('Farmer Demo must be PENDING or already APPROVED; no other status will be changed.')
    }

    const addAdminRole = !adminAccount.roles.some(({ role }) => role === AppRole.ADMIN)
    const approveFarmer = farmerStatus === FarmerVerificationStatus.PENDING
    if (options.mode === 'check') {
      return [
        addAdminRole ? 'Admin Demo: eligible; ADMIN would be added.' : 'Admin Demo: no change; ADMIN is already assigned.',
        approveFarmer ? 'Farmer Demo: eligible; PENDING would change to APPROVED.' : 'Farmer Demo: no change; status is already APPROVED.',
        'Check mode completed without writes.',
      ]
    }

    if (addAdminRole) {
      await transaction.userRoleAssignment.upsert({
        where: { userId_role: { userId: adminAccount.id, role: AppRole.ADMIN } },
        create: { userId: adminAccount.id, role: AppRole.ADMIN },
        update: {},
      })
    }
    if (approveFarmer) {
      const changed = await transaction.farmerProfile.updateMany({
        where: { id: farmerAccount.farmerProfile.id, userId: farmerAccount.id, verificationStatus: FarmerVerificationStatus.PENDING },
        data: { verificationStatus: FarmerVerificationStatus.APPROVED },
      })
      if (changed.count !== 1) {
        throw new ProvisioningError('Farmer Demo changed during provisioning; the transaction was rolled back.')
      }
    }

    // Verify the intended state inside the transaction. Throwing here prevents commit.
    const verifiedAdmin = await transaction.userRoleAssignment.findUnique({
      where: { userId_role: { userId: adminAccount.id, role: AppRole.ADMIN } },
      select: { id: true },
    })
    const verifiedFarmer = await transaction.farmerProfile.findFirst({
      where: { id: farmerAccount.farmerProfile.id, userId: farmerAccount.id },
      select: { verificationStatus: true },
    })
    if (!verifiedAdmin || verifiedFarmer?.verificationStatus !== FarmerVerificationStatus.APPROVED) {
      throw new ProvisioningError('Post-write verification failed; the transaction was rolled back.')
    }

    return [
      addAdminRole ? 'Admin Demo: ADMIN role provisioned.' : 'Admin Demo: no change; ADMIN was already assigned.',
      approveFarmer ? 'Farmer Demo: approved.' : 'Farmer Demo: no change; status was already APPROVED.',
      'Provisioning verified inside the transaction.',
    ]
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

async function main() {
  try {
    const options = parseOptions(process.argv.slice(2))
    const messages = await provision(options)
    for (const message of messages) console.info(message)
    if (options.mode === 'apply') console.info('Apply transaction completed successfully.')
  } catch (error) {
    if (error instanceof ProvisioningError) {
      console.error(`Provisioning stopped: ${error.message}`)
      process.exitCode = 1
    } else {
      // Do not print raw Prisma/driver exceptions because they may contain connection details.
      console.error('Provisioning failed. Sensitive error details were not logged.')
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

void main()
