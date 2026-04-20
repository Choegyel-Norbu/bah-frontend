import { api } from './api';

const ADDRESSES_PATH = '/users/me/addresses';

/**
 * API may return `default`; we use `isDefault` in the app.
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown> & { isDefault: boolean }}
 */
export function normalizeAddress(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const isDefault = raw.default ?? raw.isDefault ?? false;
  return { ...raw, isDefault };
}

/**
 * Extracts a user-facing error message from an API error response.
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
function getErrorMessage(error) {
  const data = error.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      return typeof first === 'string' ? first : (first?.message || first?.defaultMessage) ?? 'Validation failed';
    }
  }
  if (error.response?.status === 401) return 'Session expired. Please sign in again.';
  if (error.response?.status === 400) return 'Invalid address. Please check your details.';
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * Create a new address for the user.
 * @param {{
 *   addressType: 'SHIPPING' | 'BILLING';
 *   streetAddress: string;
 *   city: string;
 *   state: string;
 *   postalCode: string;
 *   country: string;
 *   isDefault?: boolean;
 * }} body
 * @param {string} accessToken - Bearer token (e.g. from registration flow)
 * @returns {Promise<{ id: number, addressType: string, streetAddress: string, city: string, state: string, postalCode: string, country: string, isDefault: boolean }>}
 */
export async function createAddress(body, accessToken) {
  try {
    const config = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {};
    const response = await api.post(ADDRESSES_PATH, body, config);
    const data = response?.data ?? response;
    if (data && typeof data === 'object' && data.id != null) {
      return normalizeAddress(data);
    }
    throw new Error('Invalid address response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Update an existing address.
 * @param {string} id - Address ID
 * @param {Object} body - Address data
 * @param {string} accessToken - Optional access token
 * @returns {Promise<Object>} Updated address
 */
export async function updateAddress(id, body, accessToken) {
  try {
    const config = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {};
    const response = await api.put(`${ADDRESSES_PATH}/${id}`, body, config);
    const data = response?.data ?? response;
    if (data && typeof data === 'object' && data.id != null) {
      return normalizeAddress(data);
    }
    throw new Error('Invalid address response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Set an address as default.
 * @param {string} id - Address ID
 * @param {string} accessToken - Optional access token
 * @returns {Promise<Object>} Updated address
 */
export async function setDefaultAddress(id, accessToken) {
  try {
    const config = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {};
    const response = await api.put(`${ADDRESSES_PATH}/${id}/set-default`, {}, config);
    const data = response?.data ?? response;
    if (data && typeof data === 'object' && data.id != null) {
      return normalizeAddress(data);
    }
    throw new Error('Invalid address response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Delete an address.
 * @param {string | number} id - Address ID
 * @param {string} accessToken - Optional access token
 * @returns {Promise<void>}
 */
export async function deleteAddress(id, accessToken) {
  try {
    const config = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {};
    await api.delete(`${ADDRESSES_PATH}/${id}`, config);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Fetch all addresses for the current user (uses stored token).
 * @returns {Promise<Array<{ id: number, addressType: string, streetAddress: string, city: string, state: string, postalCode: string, country: string, isDefault: boolean }>>}
 */
export async function getAddresses() {
  try {
    const response = await api.get(ADDRESSES_PATH);
    const list = Array.isArray(response) ? response : response?.data ?? response?.content ?? [];
    return Array.isArray(list) ? list.map(normalizeAddress) : [];
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
