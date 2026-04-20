import { api } from './api';

const NOTIFICATIONS_PATH = '/notifications';
const ADMIN_NOTIFICATIONS_PATH = '/admin/notifications';

/**
 * Single notification from API.
 * For order status updates (shipped/delivered): type = ORDER_STATUS_UPDATE,
 * referenceType = ORDER, referenceId = order number (e.g. ORD-20260313-0001).
 * Frontend links referenceType ORDER to /account/orders/:orderNumber using referenceId.
 * @typedef {{
 *   id: number;
 *   type: string;
 *   title: string;
 *   message: string;
 *   referenceType: string;
 *   referenceId: string;
 *   read: boolean;
 *   createdAt: string;
 * }} Notification
 */

/**
 * Paginated notifications response (ApiResponse wrapper).
 * @typedef {{
 *   content: Notification[];
 *   page: number;
 *   size: number;
 *   totalElements: number;
 *   totalPages: number;
 *   last: boolean;
 * }} NotificationsPage
 */

/**
 * Admin notification item (includes recipient userId and userEmail).
 * @typedef {Notification & { userId?: number; userEmail?: string }} AdminNotification
 */

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
  if (error.response?.status === 401) return 'Please sign in to view notifications.';
  if (error.response?.status === 404) return 'Notification not found.';
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * Unwrap ApiResponse<T> from axios response (interceptor returns response.data).
 * @param {unknown} response
 * @returns {unknown}
 */
function unwrapData(response) {
  const body = response?.data ?? response;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

/**
 * Admin: keep ORDER_STATUS_UPDATE with "Order delivered"; exclude "Order placed" (any type).
 * @param {Notification[]} content
 * @returns {Notification[]}
 */
export function filterNotificationsForAdmin(content) {
  const isOrderPlaced = (n) =>
    n.title === 'Order placed' || n.title?.toLowerCase().includes('order placed');
  return (content ?? []).filter(
    (n) =>
      !isOrderPlaced(n) &&
      (n.type === 'ORDER_STATUS_UPDATE'
        ? n.title === 'Order delivered' || n.title?.toLowerCase().includes('delivered')
        : n.type === 'NEW_ORDER')
  );
}

/**
 * Customer: keep ORDER_STATUS_UPDATE with "Order shipped" only (exclude delivered).
 * @param {Notification[]} content
 * @returns {Notification[]}
 */
export function filterNotificationsForCustomer(content) {
  return (content ?? []).filter(
    (n) =>
      n.type === 'ORDER_STATUS_UPDATE' &&
      n.title !== 'Order delivered' &&
      !n.title?.toLowerCase().includes('delivered')
  );
}

/**
 * List notifications for the current user (paginated, optional filters).
 * Auth: Bearer token required.
 * @param {{ page?: number; size?: number; read?: boolean; type?: string }} [params]
 * @returns {Promise<NotificationsPage>}
 */
export async function getNotifications(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.size != null) searchParams.set('size', String(params.size));
  if (params.read === true) searchParams.set('read', 'true');
  if (params.read === false) searchParams.set('read', 'false');
  if (params.type != null && params.type.trim() !== '') {
    searchParams.set('type', params.type.trim());
  }
  const query = searchParams.toString();
  const url = `${NOTIFICATIONS_PATH}${query ? `?${query}` : ''}`;
  const response = await api.get(url);
  const raw = unwrapData(response);
  if (!raw || typeof raw !== 'object') {
    return {
      content: [],
      page: 0,
      size: params.size ?? 20,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  const content = Array.isArray(raw.content) ? raw.content : [];
  return {
    content,
    page: Number(raw.page) ?? 0,
    size: Number(raw.size) ?? 20,
    totalElements: Number(raw.totalElements) ?? 0,
    totalPages: Number(raw.totalPages) ?? 0,
    last: Boolean(raw.last),
  };
}

/**
 * List all notifications for admin (all users, all types). Admin only.
 * GET /api/v1/admin/notifications
 * Auth: Bearer JWT with ROLE_ADMIN.
 * @param {{ page?: number; size?: number; read?: boolean; type?: string }} [params]
 *   - page (default 0), size (default 20)
 *   - read (optional): true | false
 *   - type (optional): NEW_ORDER | ORDER_STATUS_UPDATE | PROMO
 * @returns {Promise<NotificationsPage>} Paginated list; each item may include userId, userEmail (recipient).
 */
export async function getAdminNotifications(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.size != null) searchParams.set('size', String(params.size));
  if (params.read === true) searchParams.set('read', 'true');
  if (params.read === false) searchParams.set('read', 'false');
  if (params.type != null && params.type.trim() !== '') {
    searchParams.set('type', params.type.trim());
  }
  const query = searchParams.toString();
  const url = `${ADMIN_NOTIFICATIONS_PATH}${query ? `?${query}` : ''}`;
  const response = await api.get(url);
  const raw = unwrapData(response);
  if (!raw || typeof raw !== 'object') {
    return {
      content: [],
      page: 0,
      size: params.size ?? 20,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  const content = Array.isArray(raw.content) ? raw.content : [];
  return {
    content,
    page: Number(raw.page) ?? 0,
    size: Number(raw.size) ?? 20,
    totalElements: Number(raw.totalElements) ?? 0,
    totalPages: Number(raw.totalPages) ?? 0,
    last: Boolean(raw.last),
  };
}

/**
 * Mark a single notification as read.
 * PATCH /api/v1/notifications/{notificationId}/read (e.g. PATCH /api/v1/notifications/1/read)
 * Response: { success, message: "Notification marked as read", data: Notification }
 * Auth: Bearer token required.
 * @param {number} notificationId
 * @returns {Promise<Notification>} The updated notification (data.read === true)
 */
export async function markNotificationRead(notificationId) {
  if (notificationId == null || Number.isNaN(Number(notificationId))) {
    throw new Error('Notification ID is required.');
  }
  try {
    const response = await api.patch(
      `${NOTIFICATIONS_PATH}/${Number(notificationId)}/read`
    );
    const data = unwrapData(response);
    if (data && typeof data === 'object' && data.id != null) return data;
    throw new Error('Invalid notification response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Mark a single notification as read (admin).
 * PATCH /api/v1/admin/notifications/{notificationId}/read
 * Auth: Admin only (Bearer JWT with ROLE_ADMIN).
 * @param {number} notificationId
 * @returns {Promise<Notification>} The updated notification (data.read === true)
 */
export async function markAdminNotificationRead(notificationId) {
  if (notificationId == null || Number.isNaN(Number(notificationId))) {
    throw new Error('Notification ID is required.');
  }
  try {
    const response = await api.patch(
      `${ADMIN_NOTIFICATIONS_PATH}/${Number(notificationId)}/read`
    );
    const data = unwrapData(response);
    if (data && typeof data === 'object' && data.id != null) return data;
    throw new Error('Invalid notification response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Mark all notifications as read for the current user. Auth: Bearer token required.
 * @returns {Promise<void>}
 */
export async function markAllNotificationsRead() {
  try {
    await api.patch(`${NOTIFICATIONS_PATH}/read-all`);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Mark all notifications as read (admin). Auth: Admin only.
 * PATCH /api/v1/admin/notifications/read-all
 * @returns {Promise<void>}
 */
export async function markAllAdminNotificationsRead() {
  try {
    await api.patch(`${ADMIN_NOTIFICATIONS_PATH}/read-all`);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Get unread notification count for badge. Auth: Bearer token required.
 * Uses GET with read=false and size=1 to minimize payload; totalElements is the count.
 * @returns {Promise<number>}
 */
export async function getUnreadNotificationCount() {
  try {
    const result = await getNotifications({ read: false, page: 0, size: 1 });
    return result.totalElements ?? 0;
  } catch {
    return 0;
  }
}
