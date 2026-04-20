/**
 * Derive the main image URL for a variant from its images collection.
 * Prefers the primary image, then lowest sortOrder, then first with an imageUrl.
 *
 * @param {{ images?: Array<{ imageUrl?: string | null; primary?: boolean; sortOrder?: number | null }> } | null | undefined} variant
 * @returns {string | null}
 */
export function getVariantMainImageUrl(variant) {
  if (!variant || !Array.isArray(variant.images) || variant.images.length === 0) {
    return null;
  }

  const images = variant.images.filter(Boolean);
  if (images.length === 0) return null;

  const primary = images.find((img) => img && img.primary && img.imageUrl);
  if (primary && typeof primary.imageUrl === 'string' && primary.imageUrl.trim()) {
    return primary.imageUrl;
  }

  const sorted = [...images].sort((a, b) => {
    const aOrder =
      typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder)
        ? a.sortOrder
        : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.sortOrder === 'number' && Number.isFinite(b.sortOrder)
        ? b.sortOrder
        : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  const firstWithUrl = sorted.find((img) => img && typeof img.imageUrl === 'string' && img.imageUrl.trim());
  return firstWithUrl ? firstWithUrl.imageUrl : null;
}

/**
 * Derive the main image URL for a variant group (color group) from its images collection.
 * Same strategy as variants: primary → lowest sortOrder → first with imageUrl.
 *
 * @param {{ images?: Array<{ imageUrl?: string | null; primary?: boolean; sortOrder?: number | null }> } | null | undefined} group
 * @returns {string | null}
 */
export function getVariantGroupMainImageUrl(group) {
  return getVariantMainImageUrl(group);
}

/**
 * Get the best image URL to use for a product card.
 * Prefers variantGroups (new API), then variants (legacy), then product.imageUrl fallback.
 *
 * @param {{
 *   variantGroups?: Array<{ images?: Array<{ imageUrl?: string | null; primary?: boolean; sortOrder?: number | null }> }>;
 *   variants?: Array<{ images?: Array<{ imageUrl?: string | null; primary?: boolean; sortOrder?: number | null }> }>;
 *   imageUrl?: string | null;
 * } | null | undefined} product
 * @returns {string | null}
 */
export function getProductCardImageUrl(product) {
  const groups = Array.isArray(product?.variantGroups) ? product.variantGroups : [];
  const firstGroupWithImage = groups
    .map((g) => getVariantGroupMainImageUrl(g))
    .find((url) => typeof url === 'string' && url.trim());
  if (firstGroupWithImage) return firstGroupWithImage;

  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const firstVariantWithImage = variants
    .map((v) => getVariantMainImageUrl(v))
    .find((url) => typeof url === 'string' && url.trim());

  if (firstVariantWithImage) {
    return firstVariantWithImage;
  }

  // Fallback: if backend still exposes a top-level imageUrl, respect it.
  if (product && typeof product.imageUrl === 'string' && product.imageUrl.trim()) {
    return product.imageUrl;
  }

  return null;
}

