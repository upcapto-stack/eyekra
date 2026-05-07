/**
 * One-time / idempotent import: AppConfigVersion JSON products/lenses -> Product / ProductVariant / LensBlank / InventoryItem.
 * Run after migrate: `node prisma/seed-catalog.cjs` (also invoked from seed.cjs).
 */
const { PrismaClient, WarehouseKind, ProductVariantDisplayType } = require('@prisma/client');

const prisma = new PrismaClient();

function parseInr(priceStr) {
  if (priceStr == null) return 0;
  const n = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function slugPart(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 24) || 'x';
}

function colorToDisplay(c) {
  if (c && typeof c === 'object' && 'type' in c) {
    if (c.type === 'gradient') {
      return {
        displayType: ProductVariantDisplayType.GRADIENT,
        payload: { gradient: c.gradient },
      };
    }
    if (c.type === 'multi') {
      return { displayType: ProductVariantDisplayType.MULTI, payload: { hexes: c.hexes || [] } };
    }
    if (c.type === 'pattern') {
      return { displayType: ProductVariantDisplayType.PATTERN, payload: { pattern: c.pattern } };
    }
    if (c.type === 'solid') {
      return { displayType: ProductVariantDisplayType.SOLID, payload: { hex: c.hex } };
    }
  }
  const hex = c && typeof c === 'object' && 'hex' in c ? c.hex : '#000000';
  const name = c && typeof c === 'object' && 'name' in c ? c.name : 'Default';
  return { displayType: ProductVariantDisplayType.SOLID, payload: { hex } };
}

async function ensureCentralWarehouse() {
  let wh = await prisma.warehouse.findUnique({ where: { code: 'CENTRAL' } });
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        code: 'CENTRAL',
        name: 'Central warehouse & lab',
        kind: WarehouseKind.BOTH,
        city: 'Mumbai',
        state: 'Maharashtra',
        isActive: true,
      },
    });
  }
  return wh;
}

async function seedFromConfigPayload(payload) {
  const wh = await ensureCentralWarehouse();
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const lenses = Array.isArray(payload?.lenses) ? payload.lenses : [];

  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    // eslint-disable-next-line no-console
    console.log('Catalog seed skip: Product table already has rows (CENTRAL warehouse ensured).');
    return;
  }

  for (const p of products) {
    const slug = String(p.id || '').trim() || slugPart(p.name);
    const selling = parseInr(p.price);
    const mrp = parseInr(p.originalPrice) || selling * 1.2;
    const cost = Math.round(selling * 0.6 * 100) / 100;

    const created = await prisma.product.create({
      data: {
        catalogSlug: slug,
        name: String(p.name || 'Untitled'),
        brand: p.brand || 'Eyekra',
        description: p.description || null,
        categoryId: String(p.category || 'eyeglasses'),
        shape: String(p.shape || 'round'),
        material: p.material || null,
        frameType: p.frameType || null,
        lensWidth: p.lensWidth || null,
        noseBridge: p.noseBridge || null,
        templeLength: p.templeLength || null,
        newArrival: !!p.newArrival,
        topSeller: !!p.topSeller,
        rating: p.rating != null ? Number(p.rating) : null,
        reviewCount: p.reviewCount != null ? Number(p.reviewCount) : null,
        isActive: true,
        isPublished: true,
      },
    });

    const colors = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [null];
    let i = 0;
    for (const c of colors) {
      i += 1;
      const { displayType, payload } = c ? colorToDisplay(c) : colorToDisplay({ name: 'Default', hex: '#111111' });
      const colorName =
        c && typeof c === 'object' && 'name' in c && c.name
          ? String(c.name)
          : c
            ? 'Colour'
            : 'Default';
      const sku = `EYK-${slug}-${slugPart(colorName)}-${i}`.toUpperCase().slice(0, 64);
      const variant = await prisma.productVariant.create({
        data: {
          productId: created.id,
          sku,
          displayType,
          colorName,
          displayPayload: payload,
          costPrice: cost,
          mrp,
          sellingPrice: selling,
          taxRate: 18,
          hsnCode: '9004',
          reorderPoint: 5,
          isActive: true,
        },
      });
      await prisma.inventoryItem.create({
        data: {
          warehouseId: wh.id,
          variantId: variant.id,
          onHandQty: 0,
          reservedQty: 0,
          reorderPoint: 5,
        },
      });
    }
  }

  const categoryMap = new Map();
  for (const lens of lenses) {
    const key = String(lens.lensTypeCategory || 'single_vision');
    if (!categoryMap.has(key)) {
      const cat = await prisma.lensBlankCategory.create({
        data: {
          key,
          name: key.replace(/_/g, ' '),
          description: null,
          useCases: lens.useCases || ['all'],
          badge: null,
        },
      });
      categoryMap.set(key, cat.id);
    }
  }

  if (categoryMap.size === 0) {
    const cat = await prisma.lensBlankCategory.create({
      data: {
        key: 'single_vision',
        name: 'Single Vision',
        description: 'Default',
        useCases: ['all'],
      },
    });
    categoryMap.set('single_vision', cat.id);
  }

  for (const lens of lenses) {
    const key = String(lens.lensTypeCategory || 'single_vision');
    const categoryId = categoryMap.get(key);
    const selling = Number(lens.price) || 0;
    const cost = Math.round(selling * 0.55 * 100) / 100;
    const lb = await prisma.lensBlank.create({
      data: {
        categoryId,
        legacyLensId: String(lens.id),
        name: String(lens.name),
        shortDesc: String(lens.shortDesc || ''),
        description: String(lens.description || ''),
        whoIsItFor: String(lens.whoIsItFor || ''),
        lensType: String(lens.type || 'single_vision'),
        blueCut: !!lens.blueCut,
        useCases: lens.useCases || ['all'],
        badge: lens.badge || null,
        costPrice: cost,
        sellingPrice: selling,
        taxRate: 18,
        hsnCode: '9004',
        isActive: true,
      },
    });
    await prisma.inventoryItem.create({
      data: {
        warehouseId: wh.id,
        lensBlankId: lb.id,
        onHandQty: 0,
        reservedQty: 0,
        reorderPoint: 5,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Catalog seed done: ${products.length} products, ${lenses.length} lens blanks (warehouse ${wh.code}).`);
}

async function main() {
  const latest = await prisma.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
  const payload = latest?.payload || {};
  await seedFromConfigPayload(payload);
}

module.exports = { main, seedFromConfigPayload };

if (require.main === module) {
  main()
    .then(async () => prisma.$disconnect())
    .catch(async (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
