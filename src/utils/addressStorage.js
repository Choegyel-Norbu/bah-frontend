/**
 * Client-side cache for user addresses (localStorage).
 * Used for quick access on profile, checkout, etc. Source of truth remains the API.
 *
 * Why localStorage (not cookies):
 * - Addresses are structured JSON and we may have several; cookies have ~4KB limit.
 * - We don't need to send addresses to the server on every request; the server already has them.
 * - localStorage is simple, same-origin, and sufficient for caching until the user logs out.
 */

const STORAGE_KEY = 'user_addresses';

/**
 * @param {Array<Record<string, unknown>>} addresses
 */
export function setAddressesInStorage(addresses) {
  try {
    if (Array.isArray(addresses)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    }
  } catch {
    // quota or parse; ignore
  }
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function getAddressesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append or update one address in the cached list (e.g. after create).
 * @param {Record<string, unknown>} address
 */
export function addOrUpdateAddressInStorage(address) {
  const list = getAddressesFromStorage();
  const id = address?.id;
  const idx = list.findIndex((a) => a?.id === id);
  const normalized = { ...address, isDefault: address?.default ?? address?.isDefault ?? false };
  if (idx >= 0) {
    list[idx] = normalized;
  } else {
    list.push(normalized);
  }
  setAddressesInStorage(list);
}

export function clearAddressesStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
