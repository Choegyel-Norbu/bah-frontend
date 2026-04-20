import { api } from './api';

const ORDERS_PATH = '/orders';

/**
 * @typedef {{
 *   id: number;
 *   productName: string;
 *   sku: string;
 *   size: string;
 *   color: string;
 *   quantity: number;
 *   unitPrice: number;
 *   totalPrice: number;
 * }} OrderItem
 */

/**
 * @typedef {{
 *   id: number;
 *   orderNumber: string;
 *   status: string;
 *   subtotal: number;
 *   discount: number;
 *   tax: number;
 *   shippingCost: number;
 *   total: number;
 *   paymentMethod: string;
 *   paymentStatus: string;
 *   couponCode: string | null;
 *   notes: string | null;
 *   createdAt: string;
 *   items: OrderItem[];
 * }} Order
 */

/**
 * Create order from current user's cart.
 * @param {{ shippingAddressId: number; couponCode?: string; notes?: string }} body
 * @returns {Promise<Order>}
 */
export async function createOrder(body) {
  const response = await api.post(ORDERS_PATH, {
    shippingAddressId: Number(body.shippingAddressId),
    ...(body.couponCode?.trim() && { couponCode: body.couponCode.trim() }),
    ...(body.notes?.trim() && { notes: body.notes.trim() }),
  });
  const data = response?.data ?? response;
  if (!data || typeof data !== 'object') {
    throw new Error(response?.message ?? 'Failed to place order.');
  }
  return data;
}

/**
 * List current user's orders (paginated).
 * @param {{ page?: number; size?: number; status?: string }} params
 * @returns {Promise<{ content: Order[]; totalElements: number; totalPages: number; last: boolean }>}
 */
export async function getOrders(params = {}) {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const requestParams = { page, size };
  if (params.status != null && String(params.status).trim() !== '') {
    requestParams.status = String(params.status).trim();
  }
  const response = await api.get(ORDERS_PATH, { params: requestParams });
  const data = response?.data ?? response;
  const content = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
  return {
    content,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? 1,
    last: data?.last ?? true,
  };
}

/**
 * Get one order by order number.
 * @param {string} orderNumber
 * @returns {Promise<Order>}
 */
export async function getOrderByNumber(orderNumber) {
  const response = await api.get(`${ORDERS_PATH}/${encodeURIComponent(orderNumber)}`);
  const data = response?.data ?? response;
  if (!data || typeof data !== 'object') {
    throw new Error(response?.message ?? 'Order not found.');
  }
  return data;
}

/**
 * Cancel an order (if allowed).
 * @param {string} orderNumber
 * @returns {Promise<void>}
 */
export async function cancelOrder(orderNumber) {
  await api.put(`${ORDERS_PATH}/${encodeURIComponent(orderNumber)}/cancel`);
}
