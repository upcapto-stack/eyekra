const MOCK_AUTH_KEY = 'eyekra-mock-logged-in';
const MOCK_USER_KEY = 'eyekra-mock-user';
const PERSIST_AUTH_KEY = 'eyekra-session-hint';

export interface MockUser {
  id?: string;
  name: string;
  mobile: string;
  email: string;
  role?: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}

export function setMockLoggedIn(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(MOCK_AUTH_KEY, '1');
    localStorage.setItem(PERSIST_AUTH_KEY, '1');
  }
}

export function isMockLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(MOCK_AUTH_KEY) === '1' || localStorage.getItem(PERSIST_AUTH_KEY) === '1';
}

export function clearMockAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(MOCK_AUTH_KEY);
    sessionStorage.removeItem(MOCK_USER_KEY);
    localStorage.removeItem(PERSIST_AUTH_KEY);
  }
}

export function getMockUser(): MockUser {
  if (typeof window === 'undefined') return { name: '', mobile: '', email: '' };
  try {
    const raw = sessionStorage.getItem(MOCK_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockUser;
      return {
        id: parsed.id,
        name: parsed.name ?? '',
        mobile: parsed.mobile ?? '',
        email: parsed.email ?? '',
        role: parsed.role,
      };
    }
  } catch {
    // ignore
  }
  return { name: '', mobile: '', email: '' };
}

export function setMockUser(user: Partial<MockUser>): void {
  if (typeof window === 'undefined') return;
  const current = getMockUser();
  const next = { ...current, ...user };
  sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(next));
}

export async function syncSessionUser(): Promise<MockUser | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      clearMockAuth();
      return null;
    }
    const data = (await res.json()) as { user?: MockUser | null };
    if (!data.user) {
      clearMockAuth();
      return null;
    }
    setMockUser(data.user);
    setMockLoggedIn();
    return data.user;
  } catch {
    return null;
  }
}
