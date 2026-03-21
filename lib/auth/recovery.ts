export interface AuthCallbackParams {
  code: string | null;
  next: string;
  flowType: string | null;
}

export function parseAuthCallbackParams(urlValue: string, hashValue: string): AuthCallbackParams {
  const url = new URL(urlValue);
  const hashParams = new URLSearchParams(hashValue.replace(/^#/, ''));

  return {
    code: url.searchParams.get('code'),
    next: url.searchParams.get('next') || '/dashboard',
    flowType: url.searchParams.get('type') || hashParams.get('type'),
  };
}

export function isRecoveryFlow(flowType: string | null): boolean {
  return flowType === 'recovery';
}
