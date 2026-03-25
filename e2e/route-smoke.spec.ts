import { expect, test } from '@playwright/test';

const ROUTE_EXPECTATIONS: Array<{ path: string; allowedStatuses: number[] }> = [
  { path: '/', allowedStatuses: [200] },
  { path: '/shop', allowedStatuses: [200] },
  { path: '/about', allowedStatuses: [200] },
  { path: '/login', allowedStatuses: [200] },
  { path: '/signup', allowedStatuses: [200] },
  { path: '/forgot-password', allowedStatuses: [200] },
  { path: '/reset-password', allowedStatuses: [200] },
  { path: '/verify-email', allowedStatuses: [200] },
  { path: '/newsletter', allowedStatuses: [200] },
  { path: '/checkout', allowedStatuses: [200, 302, 307, 308] },
  { path: '/checkout/cancel', allowedStatuses: [200] },
  { path: '/checkout/success', allowedStatuses: [200] },
  { path: '/auth/callback', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/orders', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/returns', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/addresses', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/favorites', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/recently-viewed', allowedStatuses: [200, 302, 307, 308] },
  { path: '/dashboard/analytics', allowedStatuses: [200, 302, 307, 308] },
  { path: '/admin', allowedStatuses: [200, 302, 307, 308] },
  { path: '/admin/orders', allowedStatuses: [200, 302, 307, 308] },
  { path: '/admin/products', allowedStatuses: [200, 302, 307, 308] },
  { path: '/admin/returns', allowedStatuses: [200, 302, 307, 308] },
  { path: '/admin/payments', allowedStatuses: [200, 302, 307, 308] },
  { path: '/email-demo', allowedStatuses: [200] },
  { path: '/product/TEST-SKU-DOES-NOT-EXIST', allowedStatuses: [200, 404] },
];

test.describe('route smoke coverage', () => {
  for (const route of ROUTE_EXPECTATIONS) {
    test(`responds without server error for ${route.path}`, async ({ request }) => {
      const response = await request.get(route.path, {
        maxRedirects: 0,
      });

      const status = response.status();
      const isAllowed = route.allowedStatuses.includes(status);

      expect(
        isAllowed,
        `Expected ${route.path} to return one of [${route.allowedStatuses.join(', ')}], received ${status}`
      ).toBe(true);
    });
  }
});
