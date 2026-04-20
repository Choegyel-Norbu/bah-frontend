import { api } from './api';

const PRODUCTS_PATH = '/products';

/**
 * Single review in list/detail response.
 * @typedef {{
 *   id: number;
 *   productId: number;
 *   userId: number;
 *   userDisplayName: string;
 *   rating: number;
 *   comment: string | null;
 *   verifiedPurchase: boolean;
 *   createdAt: string;
 *   updatedAt: string;
 * }} Review
 */

/**
 * Paginated reviews response (ApiResponse wrapper).
 * @typedef {{
 *   content: Review[];
 *   page: number;
 *   size: number;
 *   totalElements: number;
 *   totalPages: number;
 *   last: boolean;
 * }} ReviewsPage
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
  if (error.response?.status === 400) return 'You can only review products you have purchased (delivered or shipped).';
  if (error.response?.status === 401) return 'Please sign in to leave a review.';
  if (error.response?.status === 404) return 'Review not found or you can only edit your own review.';
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
 * List reviews for a product (public, paginated).
 * @param {number} productId
 * @param {{ page?: number; size?: number; variantId?: number }} [params]
 * @returns {Promise<ReviewsPage>}
 */
export async function getProductReviews(productId, params = {}) {
  if (productId == null || Number.isNaN(Number(productId))) {
    throw new Error('Product ID is required.');
  }
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.size != null) searchParams.set('size', String(params.size));
   if (params.variantId != null && !Number.isNaN(Number(params.variantId))) {
     searchParams.set('variantId', String(params.variantId));
   }
  const query = searchParams.toString();
  const url = `${PRODUCTS_PATH}/${Number(productId)}/reviews${query ? `?${query}` : ''}`;
  const response = await api.get(url);
  const raw = unwrapData(response);
  if (!raw || typeof raw !== 'object') {
    return {
      content: [],
      page: 0,
      size: params.size ?? 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  const content = Array.isArray(raw.content) ? raw.content : [];
  return {
    content,
    page: Number(raw.page) ?? 0,
    size: Number(raw.size) ?? 10,
    totalElements: Number(raw.totalElements) ?? 0,
    totalPages: Number(raw.totalPages) ?? 0,
    last: Boolean(raw.last),
  };
}

/**
 * Get the current user's review for a product (optionally scoped to a variant).
 * GET /api/v1/products/{productId}/reviews/me?variantId={variantId}
 * @param {number} productId
 * @param {{ variantId?: number }} [params]
 * @returns {Promise<Review | null>}
 */
export async function getMyProductReview(productId, params = {}) {
  if (productId == null || Number.isNaN(Number(productId))) {
    throw new Error('Product ID is required.');
  }
  const searchParams = new URLSearchParams();
  if (params.variantId != null && !Number.isNaN(Number(params.variantId))) {
    searchParams.set('variantId', String(params.variantId));
  }
  const query = searchParams.toString();
  const url = `${PRODUCTS_PATH}/${Number(productId)}/reviews/me${query ? `?${query}` : ''}`;

  try {
    const response = await api.get(url);
    const data = unwrapData(response);
    if (data && typeof data === 'object' && data.id != null) {
      return data;
    }
    return null;
  } catch (err) {
    const message = getErrorMessage(err);
    // Treat not-found as \"no review\" instead of surfacing an error
    if (message && message.toLowerCase().includes('not found')) {
      return null;
    }
    throw new Error(message);
  }
}

/**
 * Create or replace own review (verified purchase required). Auth: Bearer token.
 * @param {number} productId
 * @param {{ rating: number; comment?: string; variantId: number }} body - rating 1-5, comment optional max 2000, variantId required
 * @returns {Promise<Review>}
 */
export async function createReview(productId, body) {
  if (productId == null || Number.isNaN(Number(productId))) {
    throw new Error('Product ID is required.');
  }
  const variantId = body?.variantId != null ? Number(body.variantId) : null;
  if (variantId == null || Number.isNaN(variantId)) {
    throw new Error('Variant ID is required to create a review.');
  }
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }
  const payload = { rating };
  if (body?.comment != null && typeof body.comment === 'string') {
    payload.comment = body.comment.trim().slice(0, 2000);
  }
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('variantId', String(variantId));
    const query = searchParams.toString();
    const url = `${PRODUCTS_PATH}/${Number(productId)}/reviews${query ? `?${query}` : ''}`;
    const response = await api.post(url, payload);
    const data = unwrapData(response);
    if (data && typeof data === 'object' && data.id != null) return data;
    throw new Error('Invalid review response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Update own review. Auth: Bearer token.
 * @param {number} productId
 * @param {number} reviewId
 * @param {{ rating: number; comment?: string }} body
 * @returns {Promise<Review>}
 */
export async function updateReview(productId, reviewId, body) {
  if (productId == null || Number.isNaN(Number(productId)) || reviewId == null || Number.isNaN(Number(reviewId))) {
    throw new Error('Product ID and Review ID are required.');
  }
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }
  const payload = { rating };
  if (body?.comment != null && typeof body.comment === 'string') {
    payload.comment = body.comment.trim().slice(0, 2000);
  }
  try {
    const response = await api.put(
      `${PRODUCTS_PATH}/${Number(productId)}/reviews/${Number(reviewId)}`,
      payload
    );
    const data = unwrapData(response);
    if (data && typeof data === 'object' && data.id != null) return data;
    throw new Error('Invalid review response');
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Delete own review. Auth: Bearer token.
 * @param {number} productId
 * @param {number} reviewId
 * @returns {Promise<void>}
 */
export async function deleteReview(productId, reviewId) {
  if (productId == null || Number.isNaN(Number(productId)) || reviewId == null || Number.isNaN(Number(reviewId))) {
    throw new Error('Product ID and Review ID are required.');
  }
  try {
    await api.delete(`${PRODUCTS_PATH}/${Number(productId)}/reviews/${Number(reviewId)}`);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
