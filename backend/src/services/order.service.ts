import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import {
  FarmerVerificationStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '../generated/prisma/enums.js';
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';
import type { CreateOrderInput, UpdateOrderStatusInput } from '../validators/order.validator.js';
import type { AppRole } from '../generated/prisma/enums.js';

const orderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { select: { id: true, method: true, status: true, amount: true, paidAt: true, createdAt: true } },
  buyer: { select: { id: true, fullName: true } },
  farmer: { select: { id: true, shopName: true, userId: true } },
} satisfies Prisma.OrderInclude;

type IncludedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toPublicOrder(order: IncludedOrder) {
  const { userId: _farmerUserId, ...farmer } = order.farmer;
  return { ...order, farmer };
}

type DbTransaction = Prisma.TransactionClient;

function toAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function fromDecimal(value: Prisma.Decimal): number {
  return Number(value.toString());
}

export async function listOrders(userId: string, roles: AppRole[]) {
  const where: Prisma.OrderWhereInput = roles.includes('ADMIN')
    ? {}
    : {
        OR: [
          ...(roles.includes('BUYER') ? [{ buyerId: userId }] : []),
          ...(roles.includes('FARMER') ? [{ farmer: { userId } }] : []),
        ],
      };
  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(toPublicOrder);
}

export async function getOrder(userId: string, roles: AppRole[], id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new HttpError(404, 'Order not found');
  if (roles.includes('ADMIN') || order.buyerId === userId || order.farmer.userId === userId)
    return toPublicOrder(order);
  throw new HttpError(404, 'Order not found');
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  return prisma.$transaction(async (transaction) => {
    const address = await transaction.address.findFirst({ where: { id: input.addressId, userId } });
    if (!address) throw new HttpError(404, 'Address not found');

    const requested = new Map(input.items.map(({ productId, quantity }) => [productId, quantity]));
    const products = await transaction.product.findMany({
      where: {
        id: { in: [...requested.keys()] },
        status: ProductStatus.ACTIVE,
        farmer: { verificationStatus: FarmerVerificationStatus.APPROVED },
      },
      select: { id: true, farmerId: true, name: true, price: true, stock: true },
    });
    if (products.length !== requested.size) throw new HttpError(409, 'One or more products are unavailable');
    const farmerId = products[0]?.farmerId;
    if (!farmerId || products.some((product) => product.farmerId !== farmerId)) {
      throw new HttpError(400, 'An order can contain products from one farmer only');
    }

    let subtotalCents = 0;
    const orderItems: {
      productId: string;
      productName: string;
      unitPrice: string;
      quantity: number;
      subtotal: string;
    }[] = [];
    for (const product of products) {
      const quantity = requested.get(product.id)!;
      if (product.stock < quantity) throw new HttpError(409, 'One or more products do not have enough stock');
      const unitPriceCents = Math.round(fromDecimal(product.price) * 100);
      const lineCents = unitPriceCents * quantity;
      subtotalCents += lineCents;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice: toAmount(unitPriceCents),
        quantity,
        subtotal: toAmount(lineCents),
      });
    }

    for (const item of input.items) {
      const reserved = await transaction.product.updateMany({
        where: { id: item.productId, status: ProductStatus.ACTIVE, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (reserved.count !== 1) throw new HttpError(409, 'One or more products do not have enough stock');
      await transaction.product.updateMany({
        where: { id: item.productId, stock: 0, status: ProductStatus.ACTIVE },
        data: { status: ProductStatus.OUT_OF_STOCK },
      });
    }

    const shippingCents = Math.round(input.shippingFee * 100);
    const totalCents = subtotalCents + shippingCents;
    const order = await transaction.order.create({
      data: {
        orderNumber: `LFM-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`,
        buyerId: userId,
        farmerId,
        subtotal: toAmount(subtotalCents),
        shippingFee: toAmount(shippingCents),
        totalAmount: toAmount(totalCents),
        recipientName: address.recipientName,
        recipientPhone: address.phone,
        addressLine: address.addressLine,
        subDistrict: address.subDistrict,
        district: address.district,
        province: address.province,
        postalCode: address.postalCode,
        note: input.note,
        items: { create: orderItems },
      },
      include: orderInclude,
    });
    await transaction.payment.create({
      data: {
        orderId: order.id,
        method: input.paymentMethod,
        status: PaymentStatus.PENDING,
        amount: toAmount(totalCents),
      },
    });
    const created = await transaction.order.findUnique({ where: { id: order.id }, include: orderInclude });
    if (!created) throw new HttpError(500, 'Order could not be loaded after creation');
    return toPublicOrder(created);
  });
}

async function restockCancelledOrder(transaction: DbTransaction, orderId: string) {
  const items = await transaction.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });
  for (const item of items) {
    const reactivated = await transaction.product.updateMany({
      where: { id: item.productId, status: ProductStatus.OUT_OF_STOCK },
      data: { stock: { increment: item.quantity }, status: ProductStatus.ACTIVE },
    });
    if (reactivated.count === 0) {
      await transaction.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
}

export async function updateOrderStatus(
  userId: string,
  roles: AppRole[],
  id: string,
  input: UpdateOrderStatusInput,
) {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id },
      include: { farmer: { select: { userId: true } }, payments: { select: { status: true } } },
    });
    if (!order) throw new HttpError(404, 'Order not found');

    let expectedStatus: OrderStatus | undefined;
    if (roles.includes('ADMIN')) {
      if (
        input.status === OrderStatus.CANCELLED &&
        (order.status !== OrderStatus.PENDING ||
          order.payments.some((payment) => payment.status !== PaymentStatus.PENDING))
      ) {
        throw new HttpError(409, 'Only unpaid pending orders can be cancelled');
      }
      expectedStatus = order.status;
    } else if (
      input.status === OrderStatus.CANCELLED &&
      roles.includes('BUYER') &&
      order.buyerId === userId
    ) {
      if (
        order.status !== OrderStatus.PENDING ||
        order.payments.some((payment) => payment.status !== PaymentStatus.PENDING)
      ) {
        throw new HttpError(409, 'Only unpaid pending orders can be cancelled');
      }
      expectedStatus = OrderStatus.PENDING;
    } else if (roles.includes('FARMER') && order.farmer.userId === userId) {
      const transitions: Partial<Record<OrderStatus, OrderStatus>> = {
        [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
        [OrderStatus.CONFIRMED]: OrderStatus.PROCESSING,
        [OrderStatus.PROCESSING]: OrderStatus.SHIPPED,
        [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
      };
      if (transitions[order.status] !== input.status)
        throw new HttpError(409, 'Invalid order status transition');
      expectedStatus = order.status;
    } else {
      throw new HttpError(404, 'Order not found');
    }

    const updated = await transaction.order.updateMany({
      where: { id, status: expectedStatus },
      data: { status: input.status },
    });
    if (updated.count !== 1) throw new HttpError(409, 'Order status changed; reload and try again');
    if (input.status === OrderStatus.CANCELLED) await restockCancelledOrder(transaction, id);
    const updatedOrder = await transaction.order.findUnique({ where: { id }, include: orderInclude });
    return updatedOrder ? toPublicOrder(updatedOrder) : null;
  });
}
