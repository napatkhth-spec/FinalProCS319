import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { SignJWT } from 'jose';
import { hashPassword } from '../utils/auth-crypto.js';

process.env.ACCESS_TOKEN_SECRET = randomBytes(32).toString('base64url');
process.env.ACCESS_TOKEN_ISSUER = 'local-farmer-market-api-test';
process.env.ACCESS_TOKEN_AUDIENCE = 'local-farmer-market-web-test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const [{ prisma }, { app }, { apiRouter }, { requireAccessToken, requireRoles, requireApprovedFarmer }] =
  await Promise.all([
    import('../config/database.js'),
    import('../app.js'),
    import('../routes/index.js'),
    import('../middlewares/auth.middleware.js'),
  ]);
const { getLoginRateLimitConfig, shouldSkipLoginRateLimit } = await import('../routes/auth.routes.js');
const { AppRole, FarmerVerificationStatus } = await import('../generated/prisma/enums.js');

const origin = 'http://localhost:5173';
const users = new Map<string, any>();
const originalDescriptors = new Map<string, PropertyDescriptor | undefined>();
let failRegistrationAfterCreate = false;
let userNumber = 0;
let requestIp = 1;
let server: ReturnType<typeof app.listen>;
let baseUrl = '';

function snapshotUsers() {
  return new Map([...users].map(([id, user]) => [id, structuredClone(user)]));
}

function findUser(where: Record<string, any>) {
  if (where.id) return users.get(where.id) ?? null;
  const email = where.email?.equals ?? where.email;
  if (email)
    return (
      [...users.values()].find((user) => user.email.toLowerCase() === String(email).toLowerCase()) ?? null
    );
  return null;
}

const userModel = {
  create: async ({ data }: any) => {
    if ([...users.values()].some((user) => user.email.toLowerCase() === data.email.toLowerCase())) {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    }
    const user = {
      id: data.id,
      email: data.email,
      fullName: data.fullName,
      phone: null,
      avatarUrl: null,
      isActive: true,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [{ role: data.roles.create.role }],
      farmerProfile: null,
    };
    users.set(user.id, user);
    return user;
  },
  findUnique: async ({ where }: any) => findUser(where),
  findFirst: async ({ where }: any) => findUser(where),
};

const farmerProfileModel = {
  upsert: async ({ where, create }: any) => {
    const user = users.get(where.userId);
    assert.ok(user);
    if (user.farmerProfile) return user.farmerProfile;
    user.farmerProfile = {
      id: randomUUID(),
      userId: user.id,
      ...create,
      verificationStatus: FarmerVerificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return user.farmerProfile;
  },
  findMany: async ({ where }: any) =>
    [...users.values()]
      .map((user) => user.farmerProfile)
      .filter((profile) => profile && profile.verificationStatus === where.verificationStatus)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((profile) => ({
        ...profile,
        user: { id: profile.userId, fullName: users.get(profile.userId)?.fullName },
      })),
  updateMany: async ({ where, data }: any) => {
    const profile = [...users.values()]
      .map((user) => user.farmerProfile)
      .find((candidate) => candidate?.id === where.id);
    if (!profile || profile.verificationStatus !== where.verificationStatus) return { count: 0 };
    Object.assign(profile, data);
    return { count: 1 };
  },
  findUnique: async ({ where }: any) =>
    [...users.values()]
      .map((user) => user.farmerProfile)
      .find((profile) => profile && (profile.id === where.id || profile.userId === where.userId)) ?? null,
  findUniqueOrThrow: async ({ where }: any) => {
    const profile = [...users.values()]
      .map((user) => user.farmerProfile)
      .find((candidate) => candidate?.id === where.id);
    assert.ok(profile);
    return { ...profile, user: { id: profile.userId, fullName: users.get(profile.userId)?.fullName } };
  },
};

const productModel = {
  findFirst: async () => null,
};

const userRoleAssignmentModel = {
  upsert: async ({ where, create }: any) => {
    const user = users.get(where.userId_role.userId);
    assert.ok(user);
    const role = where.userId_role.role;
    if (!user.roles.some((assignment: any) => assignment.role === role)) user.roles.push({ role });
    return user.roles.find((assignment: any) => assignment.role === role) ?? create;
  },
  findMany: async ({ where }: any) => users.get(where.userId)?.roles ?? [],
};

function installPrismaStub() {
  const transaction = async (callback: (tx: any) => Promise<unknown>) => {
    const snapshot = snapshotUsers();
    try {
      const result = await callback({
        user: userModel,
        farmerProfile: farmerProfileModel,
        userRoleAssignment: userRoleAssignmentModel,
      });
      if (failRegistrationAfterCreate) throw new Error('simulated transaction failure');
      return result;
    } catch (error) {
      users.clear();
      for (const [id, user] of snapshot) users.set(id, user);
      throw error;
    }
  };
  for (const [key, value] of Object.entries({
    user: userModel,
    farmerProfile: farmerProfileModel,
    userRoleAssignment: userRoleAssignmentModel,
    product: productModel,
    $transaction: transaction,
  })) {
    if (!originalDescriptors.has(key))
      originalDescriptors.set(key, Object.getOwnPropertyDescriptor(prisma, key));
    Object.defineProperty(prisma, key, { configurable: true, writable: true, value });
  }
}

async function request(
  path: string,
  options: { method?: string; body?: unknown; accessToken?: string; origin?: string; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    Origin: options.origin ?? origin,
    'X-Forwarded-For': options.ip ?? `198.51.100.${requestIp++}`,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function seedUser(roles: string[] = [AppRole.BUYER], overrides: Record<string, unknown> = {}) {
  userNumber += 1;
  const user: any = {
    id: randomUUID(),
    email: `test-user-${userNumber}@marketplace.invalid`,
    fullName: `Test User ${userNumber}`,
    isActive: true,
    passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: roles.map((role) => ({ role })),
    farmerProfile: null,
    ...overrides,
  };
  users.set(user.id, user);
  return user;
}

before(() => {
  installPrismaStub();
  app.set('trust proxy', 1);
  apiRouter.get('/__test/buyer', requireAccessToken, requireRoles(AppRole.BUYER), (_req, res) =>
    res.json({ success: true }),
  );
  apiRouter.get('/__test/admin', requireAccessToken, requireRoles(AppRole.ADMIN), (_req, res) =>
    res.json({ success: true }),
  );
  apiRouter.get('/__test/approved-farmer', requireAccessToken, requireApprovedFarmer, (_req, res) =>
    res.json({ success: true }),
  );
  server = app.listen(0);
  return new Promise<void>((resolve) =>
    server.once('listening', () => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    }),
  );
});

beforeEach(() => {
  users.clear();
  failRegistrationAfterCreate = false;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  for (const [key, descriptor] of originalDescriptors) {
    if (descriptor) Object.defineProperty(prisma, key, descriptor);
  }
});

test('login rate limit remains environment-specific', () => {
  assert.deepEqual(getLoginRateLimitConfig('development'), { limit: 100, windowMs: 15 * 60 * 1000 });
  assert.deepEqual(getLoginRateLimitConfig('production'), { limit: 8, windowMs: 15 * 60 * 1000 });
  assert.equal(shouldSkipLoginRateLimit('development'), true);
  assert.equal(shouldSkipLoginRateLimit('production'), false);
  assert.equal(shouldSkipLoginRateLimit('test'), false);
});

test('development login is not rate limited', async () => {
  process.env.NODE_ENV = 'development';
  try {
    const ip = '198.51.100.240';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'missing-user@marketplace.invalid', password: 'nonexistent-test-password' },
        ip,
      });
      assert.equal(response.status, 401);
    }
  } finally {
    process.env.NODE_ENV = 'test';
  }
});

test('production login remains limited to eight requests per fifteen minutes', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const ip = '198.51.100.241';
    const body = { email: 'missing-user@marketplace.invalid', password: 'nonexistent-test-password' };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      assert.equal((await request('/api/auth/login', { method: 'POST', body, ip })).status, 401);
    }
    assert.equal((await request('/api/auth/login', { method: 'POST', body, ip })).status, 429);
  } finally {
    process.env.NODE_ENV = 'test';
  }
});

test('register creates only a database user and BUYER role; client roles are rejected', async () => {
  const password = randomBytes(24).toString('base64url');
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: { email: ' Demo-Buyer@Marketplace.invalid ', password, fullName: 'Demo Buyer' },
  });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('set-cookie'), null);
  const user = [...users.values()][0];
  assert.equal(user.email, 'demo-buyer@marketplace.invalid');
  assert.deepEqual(
    user.roles.map((entry: any) => entry.role),
    [AppRole.BUYER],
  );
  assert.match(user.passwordHash, /^\$argon2id\$/);
  const withRole = await request('/api/auth/register', {
    method: 'POST',
    body: { email: 'admin@marketplace.invalid', password, fullName: 'Bad Role', role: 'ADMIN' },
  });
  assert.equal(withRole.status, 400);
  assert.equal(users.size, 1);
});

test('duplicate registration does not create another account', async () => {
  const body = {
    email: 'duplicate@marketplace.invalid',
    password: randomBytes(24).toString('base64url'),
    fullName: 'Test Duplicate',
  };
  assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
  assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
  assert.equal(users.size, 1);
});

test('login returns the real sanitized user profile and a stateless access token without a cookie', async () => {
  const password = randomBytes(24).toString('base64url');
  const user = await seedUser([AppRole.BUYER], { passwordHash: await hashPassword(password) });
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: { email: user.email, password },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  const data = ((await response.json()) as any).data;
  assert.ok(data.accessToken);
  assert.deepEqual(data.user, {
    id: user.id,
    name: user.fullName,
    email: user.email,
    roles: [AppRole.BUYER],
    farmerProfile: null,
  });
  assert.equal(JSON.stringify(data).includes('passwordHash'), false);
  assert.equal(JSON.stringify(data).includes('password_hash'), false);
  assert.equal((await request('/api/auth/me', { accessToken: data.accessToken })).status, 200);
});

test('wrong password, disabled users, and legacy users fail generically', async () => {
  const password = randomBytes(24).toString('base64url');
  const user = await seedUser([AppRole.BUYER], { passwordHash: await hashPassword(password) });
  const wrong = await request('/api/auth/login', {
    method: 'POST',
    body: { email: user.email, password: randomBytes(24).toString('base64url') },
  });
  assert.equal(wrong.status, 401);
  const disabled = await seedUser([AppRole.BUYER], {
    isActive: false,
    passwordHash: await hashPassword(password),
  });
  assert.equal(
    (await request('/api/auth/login', { method: 'POST', body: { email: disabled.email, password } })).status,
    401,
  );
  const legacy = await seedUser([AppRole.BUYER], { passwordHash: null });
  assert.equal(
    (await request('/api/auth/login', { method: 'POST', body: { email: legacy.email, password } })).status,
    401,
  );
});

test('protected API loads current roles and profile from the database for each request', async () => {
  const password = randomBytes(24).toString('base64url');
  const user = await seedUser([AppRole.BUYER], { passwordHash: await hashPassword(password) });
  const login = await request('/api/auth/login', { method: 'POST', body: { email: user.email, password } });
  const token = ((await login.json()) as any).data.accessToken;
  assert.equal((await request('/api/__test/buyer', { accessToken: token })).status, 200);
  assert.equal((await request('/api/__test/admin', { accessToken: token })).status, 403);
  user.roles.push({ role: AppRole.ADMIN });
  assert.equal((await request('/api/__test/admin', { accessToken: token })).status, 200);
  assert.equal((await request('/api/auth/me', { accessToken: token })).status, 200);
  assert.equal((await request('/api/auth/me')).status, 401);
});

test('approved farmer guard still blocks pending profiles and permits approved profiles', async () => {
  const password = randomBytes(24).toString('base64url');
  const farmer = await seedUser([AppRole.BUYER, AppRole.FARMER], {
    passwordHash: await hashPassword(password),
    farmerProfile: {
      id: randomUUID(),
      shopName: 'Demo Farm',
      verificationStatus: FarmerVerificationStatus.PENDING,
    },
  });
  const login = await request('/api/auth/login', { method: 'POST', body: { email: farmer.email, password } });
  const token = ((await login.json()) as any).data.accessToken;
  assert.equal((await request('/api/__test/approved-farmer', { accessToken: token })).status, 403);
  farmer.farmerProfile.verificationStatus = FarmerVerificationStatus.APPROVED;
  assert.equal((await request('/api/__test/approved-farmer', { accessToken: token })).status, 200);
});

test('buyer can submit a shop request as PENDING, but pending farmer cannot manage products', async () => {
  const password = randomBytes(24).toString('base64url');
  const buyer = await seedUser([AppRole.BUYER], { passwordHash: await hashPassword(password) });
  const login = await request('/api/auth/login', { method: 'POST', body: { email: buyer.email, password } });
  const token = ((await login.json()) as any).data.accessToken;
  const productId = randomUUID();
  const imageId = randomUUID();
  assert.equal(
    (await request(`/api/products/${productId}/images`, { method: 'POST', accessToken: token })).status,
    403,
  );
  assert.equal(
    (await request(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE', accessToken: token }))
      .status,
    403,
  );

  const submitted = await request('/api/farmers/profile', {
    method: 'POST',
    accessToken: token,
    body: {
      shopName: 'New Demo Shop',
      province: 'เชียงใหม่',
      description: 'Farm application',
      farmAddress: 'Demo road',
    },
  });
  assert.equal(submitted.status, 201);
  const submittedData = ((await submitted.json()) as any).data;
  const profile = submittedData.farmerProfile;
  assert.equal(profile.verificationStatus, FarmerVerificationStatus.PENDING);
  assert.deepEqual(submittedData.roles, [AppRole.BUYER, AppRole.FARMER]);
  assert.ok(buyer.roles.some((assignment: any) => assignment.role === AppRole.FARMER));
  assert.equal(
    (
      await request('/api/products', {
        method: 'POST',
        accessToken: token,
        body: { categoryId: randomUUID(), name: 'Blocked item', price: 12, stock: 2, unit: 'kg' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/api/products/${productId}/images`, { method: 'POST', accessToken: token })).status,
    403,
  );
  assert.equal(
    (await request(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE', accessToken: token }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(`/api/products/${productId}/images/${imageId}/primary`, {
        method: 'PATCH',
        accessToken: token,
      })
    ).status,
    403,
  );
});

test('admin farmer approvals list only pending profiles and reject non-admin callers', async () => {
  const pending = await seedUser([AppRole.BUYER, AppRole.FARMER], {
    farmerProfile: {
      id: randomUUID(),
      userId: '',
      shopName: 'Pending Farm',
      description: 'Test details',
      farmAddress: 'Farm road',
      profileImage: null,
      verificationStatus: FarmerVerificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  pending.farmerProfile.userId = pending.id;
  const approved = await seedUser([AppRole.BUYER, AppRole.FARMER], {
    farmerProfile: {
      id: randomUUID(),
      userId: '',
      shopName: 'Approved Farm',
      description: null,
      farmAddress: null,
      profileImage: null,
      verificationStatus: FarmerVerificationStatus.APPROVED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  approved.farmerProfile.userId = approved.id;
  const buyer = await seedUser([AppRole.BUYER]);
  const farmer = await seedUser([AppRole.BUYER, AppRole.FARMER]);
  const admin = await seedUser([AppRole.ADMIN]);
  // Sign tokens through the existing login flow with a known per-test password.
  const password = randomBytes(24).toString('base64url');
  for (const user of [buyer, farmer, admin]) user.passwordHash = await hashPassword(password);
  const buyerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: buyer.email, password },
  });
  const farmerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: farmer.email, password },
  });
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: admin.email, password },
  });
  const buyerToken = ((await buyerLogin.json()) as any).data.accessToken;
  const farmerToken = ((await farmerLogin.json()) as any).data.accessToken;
  const adminToken = ((await adminLogin.json()) as any).data.accessToken;

  assert.equal((await request('/api/farmers/admin/pending', { accessToken: buyerToken })).status, 403);
  assert.equal((await request('/api/farmers/admin/pending', { accessToken: farmerToken })).status, 403);
  assert.equal(
    (await request(`/api/products/${randomUUID()}/images`, { method: 'POST', accessToken: farmerToken }))
      .status,
    403,
  );
  const pendingResponse = await request('/api/farmers/admin/pending', { accessToken: adminToken });
  assert.equal(pendingResponse.status, 200);
  const pendingData = ((await pendingResponse.json()) as any).data;
  assert.deepEqual(
    pendingData.map((profile: any) => profile.id),
    [pending.farmerProfile.id],
  );
  assert.equal(pendingData[0].user.fullName, pending.fullName);

  assert.equal(
    (
      await request(`/api/farmers/admin/${pending.farmerProfile.id}/approve`, {
        method: 'PATCH',
        accessToken: buyerToken,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/farmers/admin/${pending.farmerProfile.id}/approve`, {
        method: 'PATCH',
        accessToken: farmerToken,
      })
    ).status,
    403,
  );
  const approval = await request(`/api/farmers/admin/${pending.farmerProfile.id}/approve`, {
    method: 'PATCH',
    accessToken: adminToken,
  });
  assert.equal(approval.status, 200);
  assert.equal(((await approval.json()) as any).data.verificationStatus, FarmerVerificationStatus.APPROVED);
  assert.equal(
    (
      await request(`/api/farmers/admin/${pending.farmerProfile.id}/approve`, {
        method: 'PATCH',
        accessToken: adminToken,
      })
    ).status,
    409,
  );
});

test('approved farmers cannot upload images to products they do not own', async () => {
  const password = randomBytes(24).toString('base64url');
  const farmer = await seedUser([AppRole.BUYER, AppRole.FARMER], {
    passwordHash: await hashPassword(password),
    farmerProfile: {
      id: randomUUID(),
      userId: '',
      shopName: 'Approved Test Farm',
      province: 'เชียงใหม่',
      verificationStatus: FarmerVerificationStatus.APPROVED,
    },
  });
  farmer.farmerProfile.userId = farmer.id;
  const login = await request('/api/auth/login', { method: 'POST', body: { email: farmer.email, password } });
  const token = ((await login.json()) as any).data.accessToken;
  const productId = randomUUID();
  const imageId = randomUUID();

  assert.equal(
    (await request(`/api/products/${productId}/images`, { method: 'POST', accessToken: token })).status,
    404,
  );
  assert.equal(
    (await request(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE', accessToken: token }))
      .status,
    404,
  );
  assert.equal(
    (
      await request(`/api/products/${productId}/images/${imageId}/primary`, {
        method: 'PATCH',
        accessToken: token,
      })
    ).status,
    404,
  );
});

test('logout is cookie-free; cleared clients get 401 but stateless issued tokens remain valid until expiry', async () => {
  const password = randomBytes(24).toString('base64url');
  const user = await seedUser([AppRole.BUYER], { passwordHash: await hashPassword(password) });
  const login = await request('/api/auth/login', { method: 'POST', body: { email: user.email, password } });
  const accessToken = ((await login.json()) as any).data.accessToken;
  const response = await request('/api/auth/logout', { method: 'POST', body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await request('/api/__test/buyer')).status, 401);
  assert.equal((await request('/api/__test/buyer', { accessToken })).status, 200);
  assert.equal((await request('/api/auth/refresh', { method: 'POST', body: {} })).status, 410);
  assert.equal((await request('/api/auth/logout-all', { method: 'POST', body: {} })).status, 410);
});

test('expired and malformed access tokens are rejected', async () => {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(process.env.ACCESS_TOKEN_ISSUER!)
    .setAudience(process.env.ACCESS_TOKEN_AUDIENCE!)
    .setSubject(randomUUID())
    .setExpirationTime('0s')
    .sign(secret);
  assert.equal((await request('/api/auth/me', { accessToken: expired })).status, 401);
  assert.equal((await request('/api/auth/me', { accessToken: 'malformed-token' })).status, 401);
});

test('logout still enforces trusted Origin', async () => {
  assert.equal(
    (await request('/api/auth/logout', { method: 'POST', body: {}, origin: 'https://untrusted.invalid' }))
      .status,
    403,
  );
});

test('failed registration transaction leaves no user', async () => {
  failRegistrationAfterCreate = true;
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: 'transaction-failure@marketplace.invalid',
      password: randomBytes(24).toString('base64url'),
      fullName: 'Transaction Test',
    },
  });
  assert.equal(response.status, 500);
  assert.equal(users.size, 0);
});
