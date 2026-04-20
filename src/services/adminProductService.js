import { api } from './api';

const ADMIN_PRODUCTS_PATH = '/admin/products';

const UPLOAD_TIMEOUT = 60_000;

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
  if (error.response?.status === 403) return 'You do not have permission to perform this action.';
  if (error.response?.status === 400) return 'Invalid product data. Please check the form.';
  if (error.response?.status === 404) return 'Product or category not found.';
  if (error.response?.status === 409) return 'This slug is already in use by another product.';
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * Admin paginated product list (GET /api/v1/admin/products).
 * Same optional query params as the public products list; response shape matches getProducts.
 * @param {Record<string, unknown>} [params] page, size, sort, category, filters, etc.
 */
export async function getAdminProducts(params = {}) {
  try {
    const searchParams = new URLSearchParams();
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.size != null) searchParams.set('size', String(params.size));
    if (params.sort != null && params.sort.trim()) searchParams.set('sort', params.sort.trim());
    if (params.category != null && params.category.trim()) searchParams.set('category', params.category.trim());
    if (params.size_filter != null && params.size_filter.trim()) {
      searchParams.set('size_filter', params.size_filter.trim());
    }
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
    const url = query ? `${ADMIN_PRODUCTS_PATH}?${query}` : ADMIN_PRODUCTS_PATH;
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
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

const ADMIN_LIST_PAGE_SIZE = 100;

/**
 * Find one product row from the admin list by slug (includes product-level {@code active}).
 * Paginates until found or catalog ends. Used when public detail omits {@code active}.
 * @param {string} slug
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function fetchAdminProductRowBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const target = slug.trim();
  if (!target) return null;
  try {
    let page = 0;
    const maxPages = 50;
    while (page < maxPages) {
      const res = await getAdminProducts({ page, size: ADMIN_LIST_PAGE_SIZE });
      const row = (res.content || []).find((p) => String(p?.slug ?? '').trim() === target);
      if (row) return row;
      if (res.last || !(res.content || []).length) break;
      page += 1;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
function getVariantErrorMessage(error) {
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
  if (error.response?.status === 403) return 'You do not have permission to perform this action.';
  if (error.response?.status === 400) return 'Invalid variant data. Please check the form.';
  if (error.response?.status === 404) return 'Variant not found or does not belong to this product.';
  if (error.response?.status === 409) return 'This SKU is already in use by another variant.';
  return error.message || 'Failed to update variant. Please try again.';
}

/**
 * Build the product JSON payload.
 * Preferred (new): variantGroups[] where images belong to the color group and sizes are purchasable rows.
 * Legacy fallback: variants[].
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
function buildProductPayload(body) {
  return {
    name: body.name,
    categoryId: Number(body.categoryId),
    active: body.active ?? (body.isActive !== false),
    featured: Boolean(body.featured ?? body.isFeatured),
    newArrival: Boolean(body.newArrival ?? body.isNewArrival),
    trending: Boolean(body.trending ?? body.isTrending),
    description: body.description?.trim() || null,
    slug: body.slug?.trim() || undefined,
    brand: body.brand?.trim() || null,
    material: body.material?.trim() || null,
    ...(Array.isArray(body.variantGroups) && {
      variantGroups: body.variantGroups.map((g) => ({
        color: String(g.color).trim(),
        isActive: g.isActive !== false,
        sizes: Array.isArray(g.sizes)
          ? g.sizes.map((s) => ({
              size: String(s.size).trim(),
              price: Number(s.price),
              stockQuantity: Number(s.stockQuantity) || 0,
              isActive: s.isActive !== false,
              discount: Number(s.discount) || 0,
            }))
          : [],
      })),
    }),
    ...(!Array.isArray(body.variantGroups) &&
      Array.isArray(body.variants) && {
        variants: body.variants.map((v) => ({
          size: String(v.size).trim(),
          color: String(v.color).trim(),
          price: Number(v.price),
          stockQuantity: Number(v.stockQuantity) || 0,
          isActive: v.isActive !== false,
          discount: Number(v.discount) || 0,
        })),
      }),
  };
}

/**
 * Images by index.
 * New (preferred): group-level images for variantGroups by index:
 * `images[0]` → group 0 files, `images[1]` → group 1 files, etc.
 *
 * Legacy fallback: variant-level images for variants by index.
 *
 * Each index entry may have 0–5 images (append nothing if none).
 *
 * Each entry in `imageFilesByIndex` may be:
 * - a single File
 * - null/undefined (no image / no change)
 * - an array of Files (up to the first 5 non-empty files)
 *
 * @param {Record<string, unknown>} payload
 * @param {Array<File | File[] | null>} imageFilesByIndex - length should match payload.variantGroups.length (preferred) or payload.variants.length (legacy)
 * @returns {FormData}
 */
function buildFormData(payload, imageFilesByIndex) {
  const formData = new FormData();
  const productBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  formData.append('product', productBlob);

  const files = Array.isArray(imageFilesByIndex) ? imageFilesByIndex : [];
  const indexCount = Array.isArray(payload?.variantGroups)
    ? payload.variantGroups.length
    : Array.isArray(payload?.variants)
      ? payload.variants.length
      : files.length;

  for (let index = 0; index < indexCount; index += 1) {
    const entry = files[index];
    const list =
      Array.isArray(entry)
        ? entry
        : (typeof FileList !== 'undefined' && entry instanceof FileList)
          ? Array.from(entry)
          : (entry ? [entry] : []);
    const normalized = list
      .filter((f) => f && typeof f.size === 'number' && f.size > 0)
      .slice(0, 5);

    normalized.forEach((file) => {
      formData.append(`images[${index}]`, file);
    });
  }
  return formData;
}

/**
 * Create a new product with group-level images (admin).
 * Sends multipart/form-data: { product: JSON blob, images[i]: repeatable files for group/variant by index }
 *
 * @param {Record<string, unknown>} body - product + variantGroups (preferred) or variants (legacy)
 * @param {Array<File | File[] | null>} [imageFilesByIndex] - entry per group (preferred) or per variant (legacy)
 * @returns {Promise<Record<string, unknown>>}
 */
export async function createProduct(body, imageFilesByIndex = []) {
  try {
    const payload = buildProductPayload(body);
    const formData = buildFormData(payload, imageFilesByIndex);
    const response = await api.post(ADMIN_PRODUCTS_PATH, formData, {
      timeout: UPLOAD_TIMEOUT,
    });
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Update an existing product (admin).
 * Sends multipart/form-data: { product: JSON blob, images[i]: repeatable files for group/variant by index }
 *
 * @param {number} id
 * @param {Record<string, unknown>} body - no product.imageUrl
 * @param {Array<File | File[] | null>} [imageFilesByIndex] - entry per group (preferred) or per variant (legacy)
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateProduct(id, body, imageFilesByIndex = []) {
  try {
    const payload = {};
    if (body.name !== undefined) payload.name = String(body.name).trim();
    if (body.slug !== undefined) payload.slug = body.slug?.trim() || null;
    if (body.description !== undefined) payload.description = body.description?.trim() || null;
    if (body.categoryId !== undefined) payload.categoryId = Number(body.categoryId);
    if (body.brand !== undefined) payload.brand = body.brand?.trim() || null;
    if (body.material !== undefined) payload.material = body.material?.trim() || null;
    if (body.active !== undefined) payload.active = Boolean(body.active);
    else if (body.isActive !== undefined) payload.active = Boolean(body.isActive);
    if (body.featured !== undefined) payload.featured = Boolean(body.featured);
    else if (body.isFeatured !== undefined) payload.featured = Boolean(body.isFeatured);
    if (body.newArrival !== undefined) payload.newArrival = Boolean(body.newArrival);
    else if (body.isNewArrival !== undefined) payload.newArrival = Boolean(body.isNewArrival);
    if (body.trending !== undefined) payload.trending = Boolean(body.trending);
    else if (body.isTrending !== undefined) payload.trending = Boolean(body.isTrending);
    if (Array.isArray(body.variantGroups)) {
      payload.variantGroups = body.variantGroups;
    } else if (Array.isArray(body.variants)) {
      payload.variants = body.variants;
    }

    const formData = buildFormData(payload, imageFilesByIndex);
    const response = await api.put(`${ADMIN_PRODUCTS_PATH}/${id}`, formData, {
      timeout: UPLOAD_TIMEOUT,
    });
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Add a new variant to an existing product (admin).
 * @param {number} productId
 * @param {{
 *   size: string;
 *   color: string;
 *   price: number;
 *   stockQuantity: number;
 *   isActive?: boolean;
 *   discount?: number;
 * }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function addVariant(productId, body) {
  try {
    const payload = {
      size: String(body.size).trim(),
      color: String(body.color).trim(),
      price: Number(body.price),
      stockQuantity: Number(body.stockQuantity) ?? 0,
      isActive: body.isActive !== false,
      discount: Number(body.discount) || 0,
    };

    const response = await api.post(`${ADMIN_PRODUCTS_PATH}/${productId}/variants`, payload);
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Add a new size option to an existing variant group (admin).
 * POST /api/v1/admin/products/{productId}/variant-groups/{groupId}/sizes
 *
 * @param {number} productId
 * @param {number} groupId
 * @param {{
 *   size: string;
 *   price: number;
 *   stockQuantity: number;
 *   isActive?: boolean;
 *   discount?: number;
 * }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function addSizeOption(productId, groupId, body) {
  try {
    const payload = {
      size: String(body.size).trim(),
      price: Number(body.price),
      stockQuantity: Number(body.stockQuantity) ?? 0,
      isActive: body.isActive !== false,
      discount: Number(body.discount) || 0,
    };
    const response = await api.post(`${ADMIN_PRODUCTS_PATH}/${productId}/variant-groups/${groupId}/sizes`, payload);
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Update a size option (admin).
 * PUT /api/v1/admin/products/{productId}/size-options/{sizeOptionId}
 *
 * @param {number} productId
 * @param {number} sizeOptionId
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateSizeOption(productId, sizeOptionId, body) {
  try {
    const payload = {};
    if (body.sku !== undefined) payload.sku = body.sku?.trim() ?? null;
    if (body.size !== undefined) payload.size = String(body.size).trim();
    if (body.price !== undefined) payload.price = Number(body.price);
    if (body.stockQuantity !== undefined) payload.stockQuantity = Number(body.stockQuantity) || 0;
    if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
    if (body.discount !== undefined) payload.discount = Number(body.discount) || 0;

    const response = await api.put(`${ADMIN_PRODUCTS_PATH}/${productId}/size-options/${sizeOptionId}`, payload);
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Delete a size option within a specific color group (admin).
 * DELETE /api/v1/admin/products/{productId}/variant-groups/{groupId}/sizes/{variantId}
 *
 * @param {number} productId
 * @param {number} groupId
 * @param {number} variantId
 * @returns {Promise<void>}
 */
export async function deleteSizeOption(productId, groupId, variantId) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${productId}/variant-groups/${groupId}/sizes/${variantId}`);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Update an existing variant (admin).
 * @param {number} productId
 * @param {number} variantId
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateVariant(productId, variantId, body) {
  try {
    const payload = {};
    if (body.sku !== undefined) payload.sku = body.sku?.trim() ?? null;
    if (body.size !== undefined) payload.size = String(body.size).trim();
    if (body.color !== undefined) payload.color = String(body.color).trim();
    if (body.price !== undefined) payload.price = Number(body.price);
    if (body.stockQuantity !== undefined) payload.stockQuantity = Number(body.stockQuantity) || 0;
    if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
    if (body.discount !== undefined) payload.discount = Number(body.discount) || 0;

    const response = await api.put(
      `${ADMIN_PRODUCTS_PATH}/${productId}/variants/${variantId}`,
      payload
    );
    return response?.data ?? response;
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Delete a product (admin).
 * DELETE /api/v1/admin/products/{id}
 * @param {number} id - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(id) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${id}`);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

/**
 * Delete a variant (admin).
 * @param {number} productId
 * @param {number} variantId
 * @returns {Promise<void>}
 */
export async function deleteVariant(productId, variantId) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${productId}/variants/${variantId}`);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Remove a variant image (admin).
 * If `imageId` is provided, deletes a specific image:
 * DELETE .../products/{productId}/variants/{variantId}/images/{imageId}
 *
 * Otherwise deletes the (legacy) single variant image:
 * DELETE .../products/{productId}/variants/{variantId}/image
 * @param {number} productId
 * @param {number} variantId
 * @param {number} [imageId]
 * @returns {Promise<void>}
 */
export async function deleteVariantImage(productId, variantId, imageId) {
  try {
    const hasImageId = imageId != null && !Number.isNaN(Number(imageId));
    const path = hasImageId
      ? `${ADMIN_PRODUCTS_PATH}/${productId}/variants/${variantId}/images/${Number(imageId)}`
      : `${ADMIN_PRODUCTS_PATH}/${productId}/variants/${variantId}/image`;
    await api.delete(path);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Clear all images for a variant group (color group).
 * DELETE /api/v1/admin/products/{productId}/variant-groups/{groupId}/images
 *
 * @param {number} productId
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function clearVariantGroupImages(productId, groupId) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${productId}/variant-groups/${groupId}/images`);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Delete one image from a variant group (color group).
 * DELETE /api/v1/admin/products/{productId}/variant-groups/{groupId}/images/{imageId}
 *
 * @param {number} productId
 * @param {number} groupId
 * @param {number} imageId
 * @returns {Promise<void>}
 */
export async function deleteVariantGroupImage(productId, groupId, imageId) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${productId}/variant-groups/${groupId}/images/${imageId}`);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}

/**
 * Delete a whole color variant group (all size options and group images).
 * DELETE /api/v1/admin/products/{productId}/variant-groups/{groupId}
 *
 * @param {number} productId
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function deleteVariantGroup(productId, groupId) {
  try {
    await api.delete(`${ADMIN_PRODUCTS_PATH}/${productId}/variant-groups/${groupId}`);
  } catch (err) {
    throw new Error(getVariantErrorMessage(err));
  }
}
