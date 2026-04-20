import { api } from './api';

const ME_PATH = '/users/me';

/**
 * Normalize API user to a consistent shape (handles snake_case and camelCase).
 * @param {Record<string, unknown>} raw
 * @returns {{ id: string, email: string, firstName: string, lastName: string, phoneNumber: string, role: string }}
 */
function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const id = raw.id ?? raw.userId ?? raw.sub ?? '';
  const email = raw.email ?? '';
  const firstName = raw.firstName ?? raw.first_name ?? '';
  const lastName = raw.lastName ?? raw.last_name ?? '';
  const phoneNumber = raw.phoneNumber ?? raw.phone_number ?? '';
  const role = raw.role ?? 'CUSTOMER';
  return {
    id: String(id),
    email: String(email),
    firstName: String(firstName),
    lastName: String(lastName),
    phoneNumber: String(phoneNumber),
    role: String(role),
    ...raw,
  };
}

/**
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
  if (error.response?.status === 400) return 'Invalid profile data. Please check your details.';
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * Fetch the current user's profile from the API.
 * @returns {Promise<{ id: string, email: string, firstName: string, lastName: string, phoneNumber: string, role: string }>}
 */
export async function getProfile() {
  try {
    const response = await api.get(ME_PATH);
    const data = response?.data ?? response;
    return normalizeUser(data);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Update the current user's profile.
 * @param {{ firstName?: string, lastName?: string, phoneNumber?: string }} body
 * @returns {Promise<{ id: string, email: string, firstName: string, lastName: string, phoneNumber: string, role: string }>}
 */
export async function updateProfile(body) {
  try {
    const response = await api.put(ME_PATH, body);
    const data = response?.data ?? response;
    return normalizeUser(data);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
