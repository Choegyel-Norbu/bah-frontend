import { api } from './api';

const ADMIN_ORDERS_PATH = '/admin/orders';

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
  if (error.response?.status === 401) return 'Unauthorized. Please sign in as admin.';
  if (error.response?.status === 403) return 'You do not have permission to manage orders.';
  if (error.response?.status === 404) return 'Order not found.';
  if (error.response?.status === 400) return 'Invalid request. Order may not be in a state that allows this action.';
  return error.message ?? 'Something went wrong. Please try again.';
}

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
 * }} AdminOrderItem
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
 *   couponCode?: string | null;
 *   notes?: string | null;
 *   createdAt: string;
 *   items: AdminOrderItem[];
 *   customer?: {
 *     id: number;
 *     email: string;
 *     firstName?: string;
 *     lastName?: string;
 *     phoneNumber?: string;
 *   };
 *   shippingAddress?: {
 *     streetAddress: string;
 *     city: string;
 *     state: string;
 *     postalCode: string;
 *     country: string;
 *   };
 *   userId?: number;
 *   customerEmail?: string;
 * }} AdminOrder
 */

/**
 * List all orders (admin). Paginated.
 * Backend response shape: { success, message, data: { content, page, size, totalElements, totalPages, last }, timestamp }
 * @param {{ page?: number; size?: number; status?: string }} params
 * @returns {Promise<{ content: AdminOrder[]; totalElements: number; totalPages: number; last: boolean }>}
 */
export async function getAdminOrders(params = {}) {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const status = params.status?.trim() || undefined;
  const response = await api.get(ADMIN_ORDERS_PATH, {
    params: { page, size, ...(status && { status }) },
  });
  // API returns { data: { content, totalElements, totalPages, last } }; axios interceptor returns full body
  const payload = response?.data ?? response;
  const data = payload && typeof payload === 'object' && payload.data != null ? payload.data : payload;
  const content = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
  return {
    content,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? 1,
    last: data?.last ?? true,
  };
}

/**
 * Get one order by order number (admin).
 * Backend may return { success, message, data: order, timestamp }; we return the order object.
 * @param {string} orderNumber
 * @returns {Promise<AdminOrder>}
 */
export async function getAdminOrderByNumber(orderNumber) {
  const response = await api.get(`${ADMIN_ORDERS_PATH}/${encodeURIComponent(orderNumber)}`);
  const payload = response?.data ?? response;
  const order =
    payload && typeof payload === 'object' && payload.data != null && typeof payload.data === 'object'
      ? payload.data
      : payload;
  if (!order || typeof order !== 'object') {
    throw new Error('Order not found.');
  }
  return order;
}

/**
 * Update order status (admin). e.g. CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED.
 * @param {string} orderNumber
 * @param {string} status
 * @returns {Promise<AdminOrder>}
 */
export async function updateOrderStatus(orderNumber, status) {
  const response = await api.put(
    `${ADMIN_ORDERS_PATH}/${encodeURIComponent(orderNumber)}/status`,
    { status }
  );
  const data = response?.data ?? response;
  if (!data || typeof data !== 'object') {
    throw new Error(response?.message ?? 'Failed to update order status.');
  }
  return data;
}

/**
 * Cancel an order (admin). Convenience for status CANCELLED.
 * @param {string} orderNumber
 * @returns {Promise<void>}
 */
export async function cancelAdminOrder(orderNumber) {
  await updateOrderStatus(orderNumber, 'CANCELLED');
}

export { getErrorMessage };
