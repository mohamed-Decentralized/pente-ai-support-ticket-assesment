const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any,
  ) {
    super(message);
  }
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) sessionStorage.setItem('pente_access_token', token);
    else sessionStorage.removeItem('pente_access_token');
  }
};

export const getAccessToken = () => accessToken;

export const restoreAccessToken = () => {
  if (typeof window !== 'undefined') accessToken = sessionStorage.getItem('pente_access_token');
  return accessToken;
};

/** Decode a JWT payload and return user claims + expiry. Returns null if malformed. */
export const decodeAccessToken = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // base64url → base64 → JSON
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as {
      sub: string;
      email: string;
      name: string;
      role: string;
      type: string;
      exp: number;
    };
    if (claims.type !== 'access') return null;
    return claims;
  } catch {
    return null;
  }
};

/** Returns true if the token is still valid with at least 60 seconds remaining. */
export const isAccessTokenFresh = (token: string) => {
  const claims = decodeAccessToken(token);
  if (!claims) return false;
  return claims.exp * 1000 > Date.now() + 60_000; // 60 s buffer
};

const notifyExpiredSession = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pente-auth-expired'));
};

const parseResponse = async (response: Response) => {
  if (response.status === 204) return undefined;
  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message ?? 'The service could not complete the request',
      response.status,
      data?.error?.code,
      data?.error?.details,
    );
  }
  return data;
};

export const refreshSession = async () => {
  const response = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await parseResponse(response);
  setAccessToken(data.accessToken);
  return data;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return apiRequest<T>(path, options, false);
    } catch {
      setAccessToken(null);
      notifyExpiredSession();
    }
  }
  return parseResponse(response) as Promise<T>;
};

export const coreOrigin = apiBase.replace(/\/api\/v1\/?$/, '');
export const reportingOrigin = process.env.NEXT_PUBLIC_REPORTING_URL ?? 'http://localhost:5001';

export const reportRequest = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${reportingOrigin}${path}`, { ...options, headers });
  if (response.status === 401 && retry) {
    try {
      await refreshSession();
      return reportRequest<T>(path, options, false);
    } catch {
      setAccessToken(null);
      notifyExpiredSession();
    }
  }
  return parseResponse(response) as Promise<T>;
};
