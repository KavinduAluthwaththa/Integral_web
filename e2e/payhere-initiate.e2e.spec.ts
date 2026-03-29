import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
test.skip(missingEnv.length > 0, `PayHere e2e requires env: ${missingEnv.join(', ')}`);

type SupabaseClient = ReturnType<typeof createClient>;

function makeAnonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function makeServiceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureTestUser(email: string, password: string) {
  const anon = makeAnonClient();
  const service = makeServiceClient();

  const signIn = async () => anon.auth.signInWithPassword({ email, password });

  let { data, error } = await signIn();

  if (!data.session || error) {
    await service.auth.admin.createUser({ email, password, email_confirm: true });
    ({ data, error } = await signIn());
  }

  if (!data.session) {
    throw new Error(`Failed to sign in test user: ${error?.message || 'unknown error'}`);
  }

  return { userId: data.session.user.id, accessToken: data.session.access_token };
}

async function seedOrder(service: SupabaseClient, userId: string) {
  const orderNumber = `E2E-${Date.now()}`;
  const sessionId = `e2e-${crypto.randomUUID()}`;

  const { data, error } = await service
    .from('orders')
    .insert({
      order_number: orderNumber,
      session_id: sessionId,
      user_id: userId,
      status: 'pending',
      subtotal: 120,
      discount: 0,
      shipping_cost: 0,
      tax: 0,
      total: 120,
    })
    .select('id, order_number')
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed order: ${error?.message || 'unknown error'}`);
  }

  return data;
}

test.describe('payhere payment routing', () => {
  test('initiates payhere payload for a pending order', async ({ request }) => {
    const email = process.env.E2E_USER_EMAIL || 'payhere-e2e@example.com';
    const password = process.env.E2E_USER_PASSWORD || 'Passw0rd!';

    const { userId, accessToken } = await ensureTestUser(email, password);
    const service = makeServiceClient();

    let orderId: string | undefined;
    let orderNumber: string | undefined;

    try {
      const order = await seedOrder(service, userId);
      orderId = order.id;
      orderNumber = order.order_number;

      const response = await request.post('/api/payments/payhere/initiate', {
        data: { orderId, currency: 'USD' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(200);

      const json = await response.json();

      expect(json.endpoint).toContain('payhere');
      expect(json.payload).toBeDefined();
      expect(json.payload.order_id).toBe(orderNumber);
      expect(json.payload.items).toBe(orderNumber);
      expect(json.payload.currency).toBe('USD');
      expect(json.payload.amount).toBe('120.00');
      expect(typeof json.payload.hash).toBe('string');
      expect(json.payload.hash.length).toBeGreaterThan(0);
    } finally {
      if (orderId) {
        await service.from('orders').delete().eq('id', orderId);
      }
    }
  });
});
