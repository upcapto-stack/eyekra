import { NextRequest, NextResponse } from 'next/server';
import type { AppConfig } from '@/types/app-config';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { isStaffOrAdmin, requireSessionUser } from '@/lib/server/authz';
import { broadcastToCustomers, createUserNotification } from '@/lib/server/notifications';

const DEFAULT_CATEGORIES = [
  { id: 'eyeglasses', label: 'Eyeglasses', sortOrder: 0 },
  { id: 'sunglasses', label: 'Sunglasses', sortOrder: 1 },
  { id: 'reading', label: 'Reading Glasses', sortOrder: 2 },
  { id: 'computer', label: 'Computer Glasses', sortOrder: 3 },
  { id: 'kids', label: 'Kids Glasses', sortOrder: 4 },
];

const DEFAULT_COLLECTIONS = [
  { id: 'new-arrivals', label: 'New Arrivals', sortOrder: 0, badge: 'New' },
  { id: 'top-sellers', label: 'Top Sellers', sortOrder: 1, badge: 'Bestseller' },
];

function getConfig(): AppConfig {
  const data = {} as AppConfig;
  data.banners = (data.banners || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  data.categories = (data.categories && data.categories.length > 0)
    ? data.categories.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : DEFAULT_CATEGORIES;
  data.collections = (data.collections && data.collections.length > 0)
    ? data.collections.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : DEFAULT_COLLECTIONS;
  data.offerRules = Array.isArray(data.offerRules) ? data.offerRules : [];
  return data;
}

export async function GET() {
  try {
    const [latest, orderCount, customerCount, revenueAgg] = await Promise.all([
      db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } }),
      db.order.count(),
      db.user.count({ where: { role: UserRole.CUSTOMER } }),
      db.order.aggregate({ _sum: { total: true } }),
    ]);
    const config = latest?.payload
      ? (latest.payload as unknown as AppConfig)
      : ({
          banners: [],
          eligibleCities: [],
          categories: DEFAULT_CATEGORIES,
          collections: DEFAULT_COLLECTIONS,
          offerRules: [],
          updatedAt: new Date().toISOString(),
        } as AppConfig);
    const normalized = { ...getConfig(), ...config };
    normalized.banners = (config.banners ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    normalized.categories = (config.categories && config.categories.length > 0)
      ? config.categories.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : DEFAULT_CATEGORIES;
    normalized.collections = (config.collections && config.collections.length > 0)
      ? config.collections.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : DEFAULT_COLLECTIONS;
    normalized.offerRules = Array.isArray(config.offerRules) ? config.offerRules : [];
    normalized.stats = {
      ...(config.stats ?? {}),
      orderCount,
      customerCount,
      totalRevenue: revenueAgg._sum.total ?? 0,
    };
    return NextResponse.json(normalized);
  } catch (e) {
    console.error('Config read error', e);
    return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  }
}

/** Admin only: update config. Send x-admin-secret header or cookie. */
export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const previous = await db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
    const previousConfig = previous?.payload ? (previous.payload as unknown as AppConfig) : null;
    const body = (await request.json()) as AppConfig;
    if (!body || !Array.isArray(body.banners) || !Array.isArray(body.eligibleCities)) {
      return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
    }
    if (!Array.isArray(body.categories)) body.categories = DEFAULT_CATEGORIES;
    if (!Array.isArray(body.collections)) body.collections = DEFAULT_COLLECTIONS;
    if (!Array.isArray(body.offerRules)) body.offerRules = [];
    if (!Array.isArray(body.products)) body.products = [];
    if (!Array.isArray(body.lenses)) body.lenses = [];
    if (!Array.isArray(body.attributes)) body.attributes = [];
    if (!Array.isArray(body.tags)) body.tags = [];
    if (body.stats == null || typeof body.stats !== 'object') body.stats = {};
    body.updatedAt = new Date().toISOString();
    await db.appConfigVersion.create({
      data: {
        payload: JSON.parse(JSON.stringify(body)),
        updatedBy: user.id,
      },
    });
    const previousOfferIds = new Set((previousConfig?.offerRules ?? []).map((r) => r.id));
    const addedOffers = (body.offerRules ?? []).filter((r) => !previousOfferIds.has(r.id)).slice(0, 3);
    for (const offer of addedOffers) {
      await broadcastToCustomers({
        type: 'offer',
        title: 'New offer is live',
        message: offer.code ? `${offer.name} (code: ${offer.code})` : offer.name,
        data: { offerRuleId: offer.id },
      }).catch(() => undefined);
      const partners = await db.user.findMany({
        where: { role: { in: [UserRole.STAFF, UserRole.ADMIN] } },
        select: { id: true },
      });
      for (const partner of partners) {
        await createUserNotification({
          userId: partner.id,
          type: 'offer',
          title: 'Partner offer update',
          message: offer.code ? `${offer.name} live with code ${offer.code}` : `${offer.name} is now live`,
          data: { offerRuleId: offer.id },
        }).catch(() => undefined);
      }
    }

    const prevNewArrivalIds = new Set((previousConfig?.products ?? []).filter((p) => p.newArrival).map((p) => p.id));
    const currentNewArrivals = (body.products ?? []).filter((p) => p.newArrival && !prevNewArrivalIds.has(p.id));
    if (currentNewArrivals.length > 0) {
      await broadcastToCustomers({
        type: 'new_arrival',
        title: 'New arrivals added',
        message: `${currentNewArrivals.length} new frame styles are now available.`,
        data: { count: currentNewArrivals.length, productIds: currentNewArrivals.map((p) => p.id) },
      }).catch(() => undefined);
    }
    return NextResponse.json(body);
  } catch (e) {
    console.error('Config write error', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
