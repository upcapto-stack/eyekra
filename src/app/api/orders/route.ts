import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@prisma/client';
import type { Order } from '@/types/order';
import { db } from '@/lib/db';
import { isStaffOrAdmin, requireSessionUser } from '@/lib/server/authz';

function generateOrderId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `ORD-${t}-${r}`.toUpperCase();
}

function toOrderStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: OrderStatus.PENDING,
    confirmed: OrderStatus.CONFIRMED,
    in_lab: OrderStatus.IN_LAB,
    qc: OrderStatus.QC,
    ready: OrderStatus.READY,
    shipped: OrderStatus.SHIPPED,
    delivered: OrderStatus.DELIVERED,
    cancelled: OrderStatus.CANCELLED,
  };
  return map[status] || OrderStatus.PENDING;
}

function fromOrderStatus(status: OrderStatus): Order['status'] {
  const map: Record<OrderStatus, Order['status']> = {
    [OrderStatus.PENDING]: 'pending',
    [OrderStatus.CONFIRMED]: 'confirmed',
    [OrderStatus.IN_LAB]: 'in_lab',
    [OrderStatus.QC]: 'qc',
    [OrderStatus.READY]: 'ready',
    [OrderStatus.SHIPPED]: 'shipped',
    [OrderStatus.DELIVERED]: 'delivered',
    [OrderStatus.CANCELLED]: 'cancelled',
  };
  return map[status];
}

function mapOrder(record: {
  id: string;
  createdAt: Date;
  status: OrderStatus;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  deliveryAddress: unknown;
  items: unknown;
  subtotal: number;
  discount: number;
  total: number;
  offerApplied: string | null;
}): Order {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    status: fromOrderStatus(record.status),
    customer: {
      name: record.customerName,
      mobile: record.customerMobile,
      email: record.customerEmail,
    },
    deliveryAddress: record.deliveryAddress as Order['deliveryAddress'],
    items: record.items as Order['items'],
    subtotal: record.subtotal,
    discount: record.discount,
    total: record.total,
    offerApplied: record.offerApplied ?? undefined,
  };
}

/** GET: user gets own orders; staff/admin get all orders. */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id')?.trim();

  try {
    const where = isStaffOrAdmin(user.role) ? {} : { userId: user.id };
    const records = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const orders = records.map(mapOrder);
    if (id) {
      const one = orders.find((o) => o.id === id);
      return NextResponse.json(one ?? null);
    }
    return NextResponse.json(orders);
  } catch (e) {
    console.error('Orders read error', e);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

/** POST: place order for authenticated customer. */
export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as Omit<Order, 'id' | 'createdAt' | 'status'> & Partial<Order>;
    if (!body || !body.customer || !body.deliveryAddress || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Invalid order: customer, deliveryAddress and items required' }, { status: 400 });
    }
    const order: Order = {
      id: body.id ?? generateOrderId(),
      createdAt: body.createdAt ?? new Date().toISOString(),
      status: body.status ?? 'pending',
      customer: body.customer,
      deliveryAddress: body.deliveryAddress,
      items: body.items,
      subtotal: Number(body.subtotal) || 0,
      discount: Number(body.discount) || 0,
      total: Number(body.total) || 0,
      offerApplied: body.offerApplied,
    };
    await db.order.create({
      data: {
        id: order.id,
        userId: user.id,
        createdAt: new Date(order.createdAt),
        status: toOrderStatus(order.status),
        customerName: order.customer.name,
        customerMobile: order.customer.mobile,
        customerEmail: order.customer.email,
        deliveryAddress: JSON.parse(JSON.stringify(order.deliveryAddress)),
        items: JSON.parse(JSON.stringify(order.items)),
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        offerApplied: order.offerApplied ?? null,
      },
    });
    return NextResponse.json({ orderId: order.id, order });
  } catch (e) {
    console.error('Order place error', e);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}

const VALID_STATUSES: Order['status'][] = ['pending', 'confirmed', 'in_lab', 'qc', 'ready', 'shipped', 'delivered', 'cancelled'];

/** PATCH: update order status (admin only). Body: { id?: string, status: Order['status'] }. id in body or ?id= */
export async function PATCH(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = (body?.id ?? request.nextUrl.searchParams.get('id'))?.trim();
    const status = typeof body?.status === 'string' ? body.status.trim() : '';
    if (!id || !VALID_STATUSES.includes(status as Order['status'])) {
      return NextResponse.json(
        { error: 'Invalid: id and status required. status must be one of: ' + VALID_STATUSES.join(', ') },
        { status: 400 }
      );
    }
    const updated = await db.order.update({
      where: { id },
      data: { status: toOrderStatus(status) },
    }).catch(() => null);
    if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order: mapOrder(updated) });
  } catch (e) {
    console.error('Order update error', e);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
