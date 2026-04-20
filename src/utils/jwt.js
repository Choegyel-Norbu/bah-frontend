/**
 * Decodes a JWT payload without verification (client-side only, for display).
 * Backend always verifies the token. Do not use for security decisions.
 *
 * @param {string} token - JWT string
 * @returns {{ sub?: string, email?: string, name?: string, role?: string, exp?: number } | null}
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Builds a minimal user object from JWT payload for AuthContext.
 *
 * @param {Record<string, unknown> | null} payload - Decoded JWT payload
 * @returns {{ id: string, email: string, name: string, role: string } | null}
 */
export function userFromJwtPayload(payload) {
  if (!payload || typeof payload.sub !== 'string') return null;
  const first = payload.given_name ?? payload.firstName ?? '';
  const last = payload.family_name ?? payload.lastName ?? '';
  const name = [first, last].filter(Boolean).join(' ') ||
    (typeof payload.name === 'string' ? payload.name : '') ||
    payload.email ||
    'User';
  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof name === 'string' ? name : 'User',
    role: typeof payload.role === 'string' ? payload.role : 'CUSTOMER',
  };
}
