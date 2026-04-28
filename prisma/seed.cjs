const fs = require('fs');
const path = require('path');
const { PrismaClient, UserRole, OrderStatus, BookingStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function readJson(fileName, fallback) {
  try {
    const filePath = path.join(process.cwd(), 'data', fileName);
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function mapOrderStatus(status) {
  const map = {
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

function mapBookingStatus(status) {
  const map = {
    pending: BookingStatus.PENDING,
    confirmed: BookingStatus.CONFIRMED,
    scheduled: BookingStatus.SCHEDULED,
    out_for_visit: BookingStatus.OUT_FOR_VISIT,
    optometrist_reached: BookingStatus.OPTOMETRIST_REACHED,
    completed: BookingStatus.COMPLETED,
    cancelled: BookingStatus.CANCELLED,
  };
  return map[status] || BookingStatus.PENDING;
}

async function ensureUser({ name, mobile, email, role }) {
  return prisma.user.upsert({
    where: { mobile },
    update: { name, email, role, isVerified: true },
    create: { name, mobile, email, role, isVerified: true },
  });
}

async function main() {
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'ChangeThisAdminPassword!';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { mobile: process.env.ADMIN_BOOTSTRAP_MOBILE || '9999999999' },
    update: {
      name: 'Platform Admin',
      email: process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@eyekra.com',
      role: UserRole.ADMIN,
      isVerified: true,
      passwordHash: adminHash,
    },
    create: {
      name: 'Platform Admin',
      mobile: process.env.ADMIN_BOOTSTRAP_MOBILE || '9999999999',
      email: process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@eyekra.com',
      role: UserRole.ADMIN,
      isVerified: true,
      passwordHash: adminHash,
    },
  });

  const config = readJson('app-config.json', null);
  if (config) {
    await prisma.appConfigVersion.create({
      data: {
        payload: config,
        updatedBy: 'seed',
      },
    });
  }

  const orders = readJson('orders.json', []);
  for (const order of orders) {
    const user = await ensureUser({
      name: order.customer?.name || 'Customer',
      mobile: order.customer?.mobile || `9${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
      email: order.customer?.email || null,
      role: UserRole.CUSTOMER,
    });

    await prisma.order.upsert({
      where: { id: order.id },
      update: {
        userId: user.id,
        status: mapOrderStatus(order.status),
        customerName: order.customer?.name || user.name,
        customerMobile: order.customer?.mobile || user.mobile,
        customerEmail: order.customer?.email || user.email || '',
        deliveryAddress: order.deliveryAddress || {},
        subtotal: Number(order.subtotal) || 0,
        discount: Number(order.discount) || 0,
        total: Number(order.total) || 0,
        offerApplied: order.offerApplied || null,
        items: order.items || [],
        createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
      },
      create: {
        id: order.id,
        userId: user.id,
        status: mapOrderStatus(order.status),
        customerName: order.customer?.name || user.name,
        customerMobile: order.customer?.mobile || user.mobile,
        customerEmail: order.customer?.email || user.email || '',
        deliveryAddress: order.deliveryAddress || {},
        subtotal: Number(order.subtotal) || 0,
        discount: Number(order.discount) || 0,
        total: Number(order.total) || 0,
        offerApplied: order.offerApplied || null,
        items: order.items || [],
        createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
      },
    });
  }

  const bookings = readJson('bookings.json', []);
  for (const booking of bookings) {
    const user = await ensureUser({
      name: booking.customer?.name || 'Customer',
      mobile: booking.customer?.mobile || `8${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
      email: booking.customer?.email || null,
      role: UserRole.CUSTOMER,
    });

    await prisma.booking.upsert({
      where: { id: booking.id },
      update: {
        userId: user.id,
        status: mapBookingStatus(booking.status),
        customerName: booking.customer?.name || user.name,
        customerMobile: booking.customer?.mobile || user.mobile,
        customerEmail: booking.customer?.email || user.email || '',
        address: booking.address || '',
        deliveryAddress: booking.deliveryAddress || null,
        preferredDate: booking.preferredDate || '',
        preferredSlotId: booking.preferredSlotId || '',
        slotLabel: booking.slotLabel || null,
        amount: Number(booking.amount) || 0,
        patients: booking.patients || null,
        tryonFrameIds: booking.tryonFrameIds || null,
        createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
      },
      create: {
        id: booking.id,
        userId: user.id,
        status: mapBookingStatus(booking.status),
        customerName: booking.customer?.name || user.name,
        customerMobile: booking.customer?.mobile || user.mobile,
        customerEmail: booking.customer?.email || user.email || '',
        address: booking.address || '',
        deliveryAddress: booking.deliveryAddress || null,
        preferredDate: booking.preferredDate || '',
        preferredSlotId: booking.preferredSlotId || '',
        slotLabel: booking.slotLabel || null,
        amount: Number(booking.amount) || 0,
        patients: booking.patients || null,
        tryonFrameIds: booking.tryonFrameIds || null,
        createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('Seed completed.');
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
