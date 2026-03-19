import { describe, expect, it } from 'vitest';
import { isRecoveryFlow, parseAuthCallbackParams } from '../lib/auth/recovery';

describe('auth recovery callback parsing', () => {
  it('parses code and next params from callback URL', () => {
    const parsed = parseAuthCallbackParams(
      'https://example.test/auth/callback?code=abc123&next=%2Fdashboard',
      ''
    );

    expect(parsed).toEqual({
      code: 'abc123',
      next: '/dashboard',
      flowType: null,
    });
  });

  it('resolves recovery flow from hash params', () => {
    const parsed = parseAuthCallbackParams(
      'https://example.test/auth/callback',
      '#type=recovery'
    );

    expect(parsed.flowType).toBe('recovery');
    expect(isRecoveryFlow(parsed.flowType)).toBe(true);
  });

  it('defaults next path when absent', () => {
    const parsed = parseAuthCallbackParams('https://example.test/auth/callback', '');

    expect(parsed.next).toBe('/dashboard');
    expect(isRecoveryFlow(parsed.flowType)).toBe(false);
  });
});
