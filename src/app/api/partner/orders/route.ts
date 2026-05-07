import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/core/api/db';
import { createUserNotification } from '@/core/api/server/notifications';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { computeLedgerTotal } from '@/core/api/server/partner/earnings';
import { partnerOrderSchema } from '@/core/api/server/partner/validation';

function generateOrderId() {
  return `ORD-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`.toUpperCase();
}

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = partnerOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { userId, items, deliveryAddress, subtotal, discount, total } = parsed.data;
    const bookingId = parsed.data.bookingId?.trim() || null;
    const offerApplied = parsed.data.offerApplied?.trim() || null;

    const customer = await db.user.findUnique({ where: { id: userId } });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const order = await db.order.create({
      data: {
        id: generateOrderId(),
        userId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        customerEmail: customer.email ?? '',
        deliveryAddress,
        subtotal,
        discount,
        total,
        offerApplied,
        items,
      },
    });

    if (bookingId) {
      const commission = Number((total || 0) * 0.1);
      const ledger = await db.partnerEarningLedger.create({
        data: {
          partnerId: partner.id,
          bookingId,
          orderId: order.id,
          earningType: 'ORDER_CONVERSION',
          commissionAmount: commission,
          totalAmount: computeLedgerTotal({ commissionAmount: commission }),
          metadata: { bookingId, orderId: order.id, orderTotal: total },
        },
      });
      await createUserNotification({
        userId: partner.id,
        type: 'payout',
        title: 'Order commission credited',
        message: `₹${ledger.totalAmount.toFixed(2)} credited for order ${order.id}.`,
        data: { orderId: order.id, ledgerId: ledger.id },
      }).catch(() => undefined);
    }

    await createUserNotification({
      userId: customer.id,
      type: 'order_placed',
      title: `Order ${order.id} placed`,
      message: `Your order has been placed successfully.`,
      data: { orderId: order.id },
    }).catch(() => undefined);
    await logPartnerAction({
      partnerId: partner.id,
      action: 'commerce.order_place',
      entityType: 'Order',
      entityId: order.id,
      metadata: { bookingId, customerId: customer.id, total },
    });

    return NextResponse.json({ ok: true, orderId: order.id, order });
  } catch (error) {
    console.error('partner order create error', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
