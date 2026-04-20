import { api } from './api';
import { getProductCardImageUrl } from '@/utils/productImages';

const PRODUCTS_PATH = '/products';

/**
 * Query params for GET /api/v1/products (all optional).
 * @typedef {{
 *   page?: number;
 *   size?: number;
 *   sort?: string;
 *   category?: string;
 *   size_filter?: string;
 *   color?: string;
 *   minPrice?: number;
 *   maxPrice?: number;
 *   search?: string;
 *   featured?: boolean;
 *   trending?: boolean;
 *   newArrivalsOnly?: boolean;
 *   onSale?: boolean;
 * }} ProductListParams
 */

/**
 * Single variant in product list response.
 * @typedef {{
 *   id: number;
 *   sku: string;
 *   size: string;
 *   color: string;
 *   price: number;
 *   stockQuantity: number;
 *   isActive: boolean;
 *   images?: Array<{
 *     id: number;
 *     imageUrl: string;
 *     primary: boolean;
 *     sortOrder: number;
 *   }>;
 * }} ProductListVariant
 */

/**
 * Single product in list response.
 * @typedef {{
 *   id: number;
 *   name: string;
 *   slug: string;
 *   basePrice: number;
 *   categoryName: string;
 *   categorySlug: string;
 *   brand: string | null;
 *   isFeatured: boolean;
 *   variants?: ProductListVariant[];
 * }} ProductListItem
 */

/**
 * Paginated products response (API may wrap in .data).
 * @typedef {{
 *   content: ProductListItem[];
 *   page: number;
 *   size: number;
 *   totalElements: number;
 *   totalPages: number;
 *   last: boolean;
 * }} ProductListResponse
 */

/**
 * Fetch paginated products with optional filters.
 * @param {ProductListParams} [params]
 * @returns {Promise<ProductListResponse>}
 */
export async function getProducts(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.size != null) searchParams.set('size', String(params.size));
  if (params.sort != null && params.sort.trim()) searchParams.set('sort', params.sort.trim());
  if (params.category != null && params.category.trim()) searchParams.set('category', params.category.trim());
  if (params.size_filter != null && params.size_filter.trim()) searchParams.set('size_filter', params.size_filter.trim());
  if (params.color != null && params.color.trim()) searchParams.set('color', params.color.trim());
  if (params.minPrice != null) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.search != null && params.search.trim()) searchParams.set('search', params.search.trim());
  if (params.featured === true) searchParams.set('featured', 'true');
  if (params.featured === false) searchParams.set('featured', 'false');
  if (params.trending === true) searchParams.set('trending', 'true');
  if (params.trending === false) searchParams.set('trending', 'false');
  if (params.newArrivalsOnly === true) searchParams.set('newArrivalsOnly', 'true');
  if (params.onSale === true) searchParams.set('onSale', 'true');

  const query = searchParams.toString();
  const url = query ? `${PRODUCTS_PATH}?${query}` : PRODUCTS_PATH;
  const response = await api.get(url);
  const body = response?.data ?? response;
  const list = body?.data ?? body;
  if (!list || !Array.isArray(list.content)) {
    return {
      content: [],
      page: 0,
      size: params.size ?? 20,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }
  return {
    content: list.content,
    page: Number(list.page) ?? 0,
    size: Number(list.size) ?? 20,
    totalElements: Number(list.totalElements) ?? 0,
    totalPages: Number(list.totalPages) ?? 0,
    last: Boolean(list.last),
  };
}

/**
 * Fetch full product detail by slug (for editing or product page).
 * @param {string} slug
 * @returns {Promise<Record<string, unknown>>} Full product with variants (same shape as PUT response)
 */
export async function getProductBySlug(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Product slug is required.');
  }
  const response = await api.get(`${PRODUCTS_PATH}/${encodeURIComponent(slug.trim())}`);
  const body = response?.data ?? response;
  return body?.data ?? body;
}

/**
 * Fetch product search suggestions (e.g. for header search dropdown).
 * API returns { success, message, data: ProductListItem[] } with variants including images[].
 * @param {{ q: string; limit?: number }} params
 * @returns {Promise<Array<{ id: number; name: string; slug: string; thumbnail: string | null; variants?: Array<{ images?: Array<{ imageUrl?: string | null; primary?: boolean; sortOrder?: number }> }> }>>}
 */
export async function getProductSuggestions({ q, limit = 5 }) {
  if (!q || typeof q !== 'string' || !q.trim()) return [];
  const searchParams = new URLSearchParams({ q: q.trim() });
  if (limit != null) searchParams.set('limit', String(Number(limit) || 5));
  const response = await api.get(`${PRODUCTS_PATH}/suggest?${searchParams.toString()}`);
  const body = response?.data ?? response;
  const data = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: getProductCardImageUrl(p),
    variants: p.variants,
  }));
}

/**
 * Fetch related products for a product detail page (You may also like).
 * API returns { success, message, data: ProductListItem[] } with variants including images[].
 * @param {string} slug - Product slug
 * @returns {Promise<ProductListItem[]>}
 */
export async function getRelatedProducts(slug) {
  if (!slug || typeof slug !== 'string' || !slug.trim()) return [];
  const response = await api.get(`${PRODUCTS_PATH}/slug/${encodeURIComponent(slug.trim())}/related`);
  const body = response?.data ?? response;
  const data = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
  return data;
}
