import type { LensBlank, LensBlankCategory, Product, ProductVariant } from '@prisma/client';
import { ProductVariantDisplayType } from '@prisma/client';
import type { Product as LegacyProduct, ColorVariant } from '@/shared/utils/products-data';
import type { LensOption } from '@/shared/utils/lenses-data';
import type { LensTypeCategory } from '@/shared/utils/lenses-data';

function formatInr(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function displayTypeToColorVariant(v: ProductVariant): ColorVariant {
  const name = v.colorName;
  const payload = (v.displayPayload ?? null) as Record<string, unknown> | null;
  switch (v.displayType) {
    case ProductVariantDisplayType.GRADIENT:
      return {
        type: 'gradient',
        name,
        gradient: typeof payload?.gradient === 'string' ? payload.gradient : 'linear-gradient(135deg, #6366f1, #ec4899)',
      };
    case ProductVariantDisplayType.MULTI:
      return {
        type: 'multi',
        name,
        hexes: Array.isArray(payload?.hexes) ? (payload.hexes as string[]) : ['#000000'],
      };
    case ProductVariantDisplayType.PATTERN:
      return { type: 'pattern', name, pattern: typeof payload?.pattern === 'string' ? payload.pattern : undefined };
    default:
      return {
        type: 'solid',
        name,
        hex: typeof payload?.hex === 'string' ? payload.hex : '#000000',
      };
  }
}

export function productVariantToLegacyColors(variants: ProductVariant[]): ColorVariant[] {
  return variants.filter((x) => x.isActive).map(displayTypeToColorVariant);
}

export function dbProductToLegacyProduct(p: Product & { variants: ProductVariant[] }): LegacyProduct {
  const v0 = p.variants.find((x) => x.isActive) ?? p.variants[0];
  const selling = v0 ? Number(v0.sellingPrice) : 0;
  const mrp = v0 ? Number(v0.mrp) : 0;
  const discountPct = mrp > selling && mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : undefined;
  const colors = p.variants.length > 0 ? productVariantToLegacyColors(p.variants) : undefined;
  return {
    id: p.catalogSlug,
    name: p.name,
    brand: p.brand ?? undefined,
    price: formatInr(selling),
    originalPrice: mrp > selling ? formatInr(mrp) : undefined,
    discount: discountPct != null && discountPct > 0 ? `${discountPct}% off` : undefined,
    category: p.categoryId,
    shape: p.shape as LegacyProduct['shape'],
    newArrival: p.newArrival || undefined,
    topSeller: p.topSeller || undefined,
    rating: p.rating ?? undefined,
    reviewCount: p.reviewCount ?? undefined,
    material: p.material ?? undefined,
    frameType: p.frameType ?? undefined,
    lensWidth: p.lensWidth ?? undefined,
    noseBridge: p.noseBridge ?? undefined,
    templeLength: p.templeLength ?? undefined,
    description: p.description ?? undefined,
    colors,
  };
}

export function dbLensBlankToLensOption(lb: LensBlank & { category: LensBlankCategory }): LensOption {
  const useCases = (Array.isArray(lb.useCases) ? lb.useCases : []) as LensOption['useCases'];
  return {
    id: lb.legacyLensId ?? lb.id,
    name: lb.name,
    shortDesc: lb.shortDesc,
    description: lb.description,
    whoIsItFor: lb.whoIsItFor,
    price: Number(lb.sellingPrice),
    lensTypeCategory: lb.category.key as LensTypeCategory,
    useCases: useCases.length > 0 ? useCases : ['all'],
    blueCut: lb.blueCut,
    type: lb.lensType as LensOption['type'],
    badge: lb.badge ?? undefined,
  };
}
