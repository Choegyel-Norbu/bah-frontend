import { api } from './api';

const CART_PATH = '/cart';
const CART_ITEMS_PATH = '/cart/items';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The backend cart payload includes both `unitPrice` and `discount`.
 * In some responses `totalPrice` may not reflect the discounted total,
 * so we normalize it here to keep the UI consistent.
 */
function normalizeCartData(data) {
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const normalizedItems = rawItems.map((item) => {
    const id = item?.id;
    const variantId = item?.variantId ?? item?.variant_id;
    const productName = item?.productName ?? item?.product_name;
    const sku = item?.sku;
    const size = item?.size;
    const color = item?.color;

    const unitPrice = toNumber(item?.unitPrice ?? item?.unit_price, 0);
    const discount = toNumber(item?.discount ?? item?.discountAmount ?? 0, 0);
    const quantity = toNumber(item?.quantity, 0);

    // Effective pricing for the cart UI.
    const hasDiscount = Number.isFinite(discount) && discount > 0;
    const effectiveUnitPrice = hasDiscount ? Math.max(0, unitPrice - discount) : unitPrice;
    const effectiveTotalPrice = effectiveUnitPrice * quantity;
    const backendTotalPrice = toNumber(item?.totalPrice ?? item?.total_price ?? effectiveTotalPrice, effectiveTotalPrice);
    const shouldOverride =
      hasDiscount && Math.abs(backendTotalPrice - effectiveTotalPrice) > 0.01;

    return {
      id,
      variantId,
      productName,
      sku,
      size,
      color,
      unitPrice,
      quantity,
      totalPrice: shouldOverride ? effectiveTotalPrice : backendTotalPrice,
      imageUrl: item?.imageUrl ?? item?.image_url ?? item?.productImageUrl ?? null,
      availableStock: item?.availableStock ?? item?.available_stock,
    };
  });

  const subtotal = normalizedItems.reduce((acc, it) => acc + (toNumber(it?.totalPrice, 0)), 0);
  const totalItems = toNumber(data?.totalItems ?? data?.total_items ?? normalizedItems.length, 0);

  return {
    id: data?.id ?? null,
    items: normalizedItems,
    subtotal,
    totalItems,
  };
}

/**
 * @typedef {{
 *   id: number;
 *   variantId: number;
 *   productName: string;
 *   sku: string;
 *   size: string;
 *   color: string;
 *   unitPrice: number;
 *   quantity: number;
 *   totalPrice: number;
 *   imageUrl: string | null;
 *   availableStock: number;
 * }} CartItem
 */

/**
 * @typedef {{
 *   id: number;
 *   items: CartItem[];
 *   subtotal: number;
 *   totalItems: number;
 * }} CartData
 */

/**
 * Get current cart. Requires auth. Returns empty cart shape if 401.
 * @returns {Promise<CartData | null>}
 */
export async function getCart() {
  try {
    const body = await api.get(CART_PATH);
    const data = body?.data ?? body;
    if (!data) return null;
    return normalizeCartData(data);
  } catch (err) {
    if (err?.response?.status === 401) return null;
    throw new Error(err?.response?.data?.message ?? err?.message ?? 'Failed to load cart.');
  }
}

/**
 * Add an item to the cart.
 * @param {number} variantId
 * @param {number} [quantity=1]
 * @returns {Promise<CartData>}
 */
export async function addCartItem(variantId, quantity = 1) {
  const body = await api.post(CART_ITEMS_PATH, {
    variantId: Number(variantId),
    quantity: Math.max(1, Number(quantity) || 1),
  });
  if (!body?.data) {
    throw new Error(body?.message ?? 'Failed to add item to cart.');
  }
  return normalizeCartData(body.data);
}

/**
 * Update cart item quantity.
 * @param {number} itemId - Cart line item ID
 * @param {number} quantity
 * @returns {Promise<CartData>}
 */
export async function updateCartItem(itemId, quantity) {
  const body = await api.put(`${CART_ITEMS_PATH}/${itemId}`, {
    quantity: Math.max(0, Number(quantity) || 0),
  });
  if (!body?.data) {
    throw new Error(body?.message ?? 'Failed to update cart.');
  }
  return normalizeCartData(body.data);
}

/**
 * Remove one item from the cart.
 * @param {number} itemId - Cart line item ID
 * @returns {Promise<CartData>}
 */
export async function removeCartItem(itemId) {
  await api.delete(`${CART_ITEMS_PATH}/${itemId}`);
  const body = await api.get(CART_PATH);
  const data = body?.data ?? body;
  return normalizeCartData(data ?? {});
}

/**
 * Clear entire cart.
 * @returns {Promise<void>}
 */
export async function clearCart() {
  await api.delete(CART_PATH);
}
