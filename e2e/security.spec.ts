import { expect, test } from '@playwright/test';

test.describe('security route protections', () => {
  test('does not expose x-powered-by header on public pages', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-powered-by']).toBeUndefined();
  });

  test('rejects unauthenticated admin api access', async ({ request }) => {
    const response = await request.get('/api/admin/orders');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Missing bearer token' });
  });

  test('rejects unauthenticated payment initiation requests', async ({ request }) => {
    const response = await request.post('/api/payments/payhere/initiate', {
      data: { orderId: 'order-1' },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Missing bearer token' });
  });
});
