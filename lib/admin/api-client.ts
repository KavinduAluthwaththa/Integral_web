export function createAdminApiClient(accessToken?: string | null) {
  return async function adminApiRequest<T = any>(url: string, init?: RequestInit): Promise<T> {
    if (!accessToken) {
      throw new Error('Missing session token');
    }

    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers || {}),
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Request failed');
    }

    return payload as T;
  };
}