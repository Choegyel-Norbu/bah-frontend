import { api } from './api';

const WISHLIST_PATH = '/wishlist';

/**
 * Fetch authenticated user's wishlist with full product details.
 * GET /wishlist
 */
export async function getWishlistItems() {
  try {
    const body = await api.get(WISHLIST_PATH);
    const data = body?.data ?? body;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const message =
      err?.response?.data?.message ??
      err?.message ??
      'Failed to load wishlist.';
    const error = new Error(message);
    error.status = err?.response?.status;
    throw error;
  }
}

/**
 * Add a wishlist item for a specific product + variant selection.
 * Backend commonly accepts:
 * POST /wishlist
 * { productId: "<id>", variantId?: "<variantId>" }
 */
export async function addWishlistItem(productId, variantId = null) {
  try {
    const payload = {
      productId: String(productId),
      ...(variantId != null ? { variantId: String(variantId) } : {}),
    };
    const body = await api.post(WISHLIST_PATH, payload);
    return body?.data ?? null;
  } catch (err) {
    const message =
      err?.response?.data?.message ??
      err?.message ??
      'Failed to add product to wishlist.';
    const error = new Error(message);
    error.status = err?.response?.status;
    throw error;
  }
}

/**
 * Remove item from wishlist by product, optionally scoped to variant.
 * DELETE /wishlist/{productId}[?variantId=...]
 */
export async function deleteWishlistItem(productId, variantId = null) {
  try {
    const path = `${WISHLIST_PATH}/${encodeURIComponent(String(productId))}`;
    if (variantId != null) {
      await api.delete(path, {
        params: { variantId: String(variantId) },
      });
      return;
    }
    await api.delete(path);
  } catch (err) {
    const message =
      err?.response?.data?.message ??
      err?.message ??
      'Failed to remove product from wishlist.';
    const error = new Error(message);
    error.status = err?.response?.status;
    throw error;
  }
}
