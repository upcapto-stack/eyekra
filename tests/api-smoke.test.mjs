import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

async function getJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}

test('config API returns payload', async () => {
  const { response, data } = await getJson('/api/config');
  assert.ok([200, 404].includes(response.status));
  assert.equal(typeof data, 'object');
  if (response.status === 200) {
    assert.ok(data && 'updatedAt' in data);
  } else {
    assert.ok(data && 'error' in data);
  }
});

test('auth me rejects unauthenticated request', async () => {
  const { response, data } = await getJson('/api/auth/me');
  assert.equal(response.status, 401);
  assert.equal(data?.user ?? null, null);
});

test('orders API requires authentication', async () => {
  const { response } = await getJson('/api/orders');
  assert.equal(response.status, 401);
});

test('bookings API requires authentication', async () => {
  const { response } = await getJson('/api/bookings');
  assert.equal(response.status, 401);
});
