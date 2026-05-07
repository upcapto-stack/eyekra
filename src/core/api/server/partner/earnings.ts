export function computeLedgerTotal(input: {
  baseAmount?: number;
  distanceAmount?: number;
  commissionAmount?: number;
  incentiveAmount?: number;
}): number {
  const baseAmount = Number(input.baseAmount ?? 0);
  const distanceAmount = Number(input.distanceAmount ?? 0);
  const commissionAmount = Number(input.commissionAmount ?? 0);
  const incentiveAmount = Number(input.incentiveAmount ?? 0);
  return baseAmount + distanceAmount + commissionAmount + incentiveAmount;
}

export function summarizePathDistanceKm(path: unknown): number {
  if (!Array.isArray(path) || path.length < 2) return 0;
  const points = path
    .map((p) => {
      if (typeof p !== 'object' || p === null) return null;
      const lat = Number((p as { lat?: unknown }).lat);
      const lng = Number((p as { lng?: unknown }).lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter((p): p is { lat: number; lng: number } => p != null);
  if (points.length < 2) return 0;

  const toRad = (v: number) => (v * Math.PI) / 180;
  let km = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const q =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
    km += 6371 * c;
  }
  return Number(km.toFixed(2));
}
