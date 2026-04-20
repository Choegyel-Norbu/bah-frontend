import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import { getWishlistItems } from '@/services/wishlistService';

export const WishlistContext = createContext(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};

function toWishlistSets(wishlistItems) {
  const productIds = new Set();
  const variantIds = new Set();
  if (!Array.isArray(wishlistItems)) return { productIds, variantIds };

  for (const entry of wishlistItems) {
    const rawProductId = entry?.product?.id ?? entry?.productId;
    if (rawProductId != null) {
      productIds.add(String(rawProductId));
    }

    const rawVariantId =
      entry?.variantId ??
      entry?.productVariantId ??
      entry?.variant?.id ??
      entry?.sizeOption?.id ??
      null;
    if (rawVariantId != null) {
      variantIds.add(String(rawVariantId));
    }
  }

  return { productIds, variantIds };
}

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wishlistProductIds, setWishlistProductIds] = useState(() => new Set());
  const [wishlistVariantIds, setWishlistVariantIds] = useState(() => new Set());
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistProductIds(new Set());
      setWishlistVariantIds(new Set());
      return;
    }

    setWishlistLoading(true);
    try {
      const items = await getWishlistItems();
      const { productIds, variantIds } = toWishlistSets(items);
      setWishlistProductIds(productIds);
      setWishlistVariantIds(variantIds);
    } catch {
      setWishlistProductIds(new Set());
      setWishlistVariantIds(new Set());
    } finally {
      setWishlistLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist().catch(() => {});
  }, [refreshWishlist]);

  const addLocalWishlistItem = useCallback((productId, variantId) => {
    if (productId != null) {
      setWishlistProductIds((prev) => {
        const next = new Set(prev);
        next.add(String(productId));
        return next;
      });
    }
    if (variantId != null) {
      setWishlistVariantIds((prev) => {
        const next = new Set(prev);
        next.add(String(variantId));
        return next;
      });
    }
  }, []);

  const removeLocalWishlistItem = useCallback((productId, variantId) => {
    if (productId != null) {
      setWishlistProductIds((prev) => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(String(productId));
        return next;
      });
    }
    if (variantId != null) {
      setWishlistVariantIds((prev) => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(String(variantId));
        return next;
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      wishlistProductIds,
      wishlistVariantIds,
      wishlistLoading,
      refreshWishlist,
      addLocalWishlistItem,
      removeLocalWishlistItem,
      isProductWishlisted: (productId) =>
        productId != null ? wishlistProductIds.has(String(productId)) : false,
      isVariantWishlisted: (variantId) =>
        variantId != null ? wishlistVariantIds.has(String(variantId)) : false,
    }),
    [
      wishlistProductIds,
      wishlistVariantIds,
      wishlistLoading,
      refreshWishlist,
      addLocalWishlistItem,
      removeLocalWishlistItem,
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

WishlistProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

