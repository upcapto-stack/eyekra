const LOCATIONS_KEY = 'eyekra-locations';
const LEGACY_LOCATION_KEY = 'eyekra-location';
let locationHydrated = false;

export interface SavedLocation {
  displayName: string;
  address: string;
  /** Flat / House no. / Building (Swiggy-style) */
  flatNo?: string;
  contact?: string;
}

/** Default used for SSR and initial client render to avoid hydration mismatch */
export const DEFAULT_LOCATION: SavedLocation = {
  displayName: 'Home',
  address: 'Sector 18, Noida, Uttar Pradesh 201301',
};

interface StoredLocations {
  locations: SavedLocation[];
  selectedIndex: number;
}

function getStored(): StoredLocations {
  if (typeof window === 'undefined') {
    return { locations: [DEFAULT_LOCATION], selectedIndex: 0 };
  }
  try {
    const raw = sessionStorage.getItem(LOCATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredLocations;
      if (Array.isArray(parsed.locations) && parsed.locations.length > 0) {
        const idx = Math.min(Math.max(0, parsed.selectedIndex ?? 0), parsed.locations.length - 1);
        return { locations: parsed.locations, selectedIndex: idx };
      }
    }
    // Migrate from legacy single location
    const legacy = sessionStorage.getItem(LEGACY_LOCATION_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as SavedLocation;
      if (parsed?.displayName && parsed?.address) {
        const migrated = { locations: [parsed], selectedIndex: 0 };
        setStored(migrated);
        sessionStorage.removeItem(LEGACY_LOCATION_KEY);
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !locationHydrated) {
    locationHydrated = true;
    void hydrateLocationsFromServer();
  }
  return { locations: [DEFAULT_LOCATION], selectedIndex: 0 };
}

function setStored(data: StoredLocations): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LOCATIONS_KEY, JSON.stringify(data));
    void syncLocationsToServer(data);
  }
}

async function hydrateLocationsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/user/addresses', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { addresses?: Array<Record<string, unknown>> };
    const locations = (data.addresses ?? []).map((address) => ({
      displayName: String(address.displayName ?? 'Home'),
      address: String(address.address ?? ''),
      flatNo: address.flatNo ? String(address.flatNo) : undefined,
      contact: address.contactMobile ? String(address.contactMobile) : undefined,
    }));
    if (locations.length > 0) {
      sessionStorage.setItem(LOCATIONS_KEY, JSON.stringify({ locations, selectedIndex: 0 }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch {
    // ignore
  }
}

async function syncLocationsToServer(data: StoredLocations): Promise<void> {
  try {
    await fetch('/api/user/addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        addresses: data.locations.map((loc) => ({
          displayName: loc.displayName,
          address: loc.address,
          flatNo: loc.flatNo ?? null,
          contactMobile: loc.contact ?? null,
        })),
      }),
    });
  } catch {
    // ignore
  }
}

export function getLocation(): SavedLocation {
  const { locations, selectedIndex } = getStored();
  return locations[selectedIndex] ?? DEFAULT_LOCATION;
}

export function getLocations(): SavedLocation[] {
  return getStored().locations;
}

export function getSelectedIndex(): number {
  return getStored().selectedIndex;
}

export function setLocation(loc: SavedLocation): void {
  const { locations, selectedIndex } = getStored();
  const next = [...locations];
  const existing = next.findIndex(
    (l) => l.displayName === loc.displayName && l.address === loc.address
  );
  if (existing >= 0) {
    next[existing] = loc;
    setStored({ locations: next, selectedIndex: existing });
  } else if (next.length === 1) {
    // Single address: replace in place (e.g. from simple "Change location" modal)
    next[0] = loc;
    setStored({ locations: next, selectedIndex: 0 });
  } else {
    next.push(loc);
    setStored({ locations: next, selectedIndex: next.length - 1 });
  }
}

export function setLocations(locations: SavedLocation[], selectedIndex?: number): void {
  if (locations.length === 0) locations = [DEFAULT_LOCATION];
  const idx =
    selectedIndex !== undefined
      ? Math.min(Math.max(0, selectedIndex), locations.length - 1)
      : getStored().selectedIndex;
  const safeIdx = Math.min(idx, locations.length - 1);
  setStored({ locations, selectedIndex: safeIdx });
}

export function addLocation(loc: SavedLocation): void {
  const { locations } = getStored();
  setStored({ locations: [...locations, loc], selectedIndex: locations.length });
}

export function updateLocationAtIndex(index: number, loc: SavedLocation): void {
  const { locations, selectedIndex } = getStored();
  if (index < 0 || index >= locations.length) return;
  const next = [...locations];
  next[index] = loc;
  setStored({ locations: next, selectedIndex });
}

export function removeLocationAtIndex(index: number): void {
  const { locations, selectedIndex } = getStored();
  if (index < 0 || index >= locations.length) return;
  const next = locations.filter((_, i) => i !== index);
  const newSelected =
    next.length === 0 ? 0 : Math.min(selectedIndex, next.length - 1);
  setStored({
    locations: next.length > 0 ? next : [DEFAULT_LOCATION],
    selectedIndex: newSelected,
  });
}

export function setSelectedLocationIndex(index: number): void {
  const { locations } = getStored();
  const safeIdx = Math.min(Math.max(0, index), locations.length - 1);
  setStored({ locations, selectedIndex: safeIdx });
}
