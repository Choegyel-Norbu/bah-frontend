import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2, ImageOff, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { getWishlistItems, deleteWishlistItem } from '@/services/wishlistService';
import { getProductCardImageUrl } from '@/utils/productImages';
import { useWishlist } from '@/context/WishlistContext';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function pickFirstVariantId(product) {
  const variantGroups = Array.isArray(product?.variantGroups) ? product.variantGroups : [];
  for (const group of variantGroups) {
    if (!group || group.active === false || group.isActive === false) continue;
    const sizeOptions = Array.isArray(group.sizeOptions) ? group.sizeOptions : [];
    const firstActive = sizeOptions.find((s) => s && s.active !== false && s.isActive !== false);
    if (firstActive?.id != null) return firstActive.id;
  }
  return null;
}

function resolveWishlistVariantId(entry, product) {
  return (
    entry?.variantId ??
    entry?.productVariantId ??
    entry?.variant?.id ??
    entry?.sizeOption?.id ??
    pickFirstVariantId(product)
  );
}

export default function WishlistPage() {
  const { addToCart } = useCart();
  const { show: showToast } = useToast();
  const { removeLocalWishlistItem } = useWishlist();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWishlistItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message ?? 'Failed to load wishlist.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const normalizedItems = useMemo(
    () =>
      items.map((entry) => {
        const product = entry?.product ?? null;
        return {
          wishlistItemId: entry?.id,
          addedAt: entry?.addedAt,
          product,
          productId: product?.id,
          name: product?.name ?? 'Product',
          slug: product?.slug,
          categoryName: product?.categoryName,
          imageUrl: product ? getProductCardImageUrl(product) : null,
          variantId: resolveWishlistVariantId(entry, product),
        };
      }),
    [items]
  );

  const handleMoveToCart = async (entry) => {
    if (!entry?.variantId || !entry?.productId || movingId != null) return;
    setMovingId(entry.wishlistItemId);
    try {
      await addToCart(entry.variantId, 1);
      await deleteWishlistItem(entry.productId, entry.variantId);
      removeLocalWishlistItem(entry.productId, entry.variantId);
      setItems((prev) =>
        prev.filter((w) => String(w?.id) !== String(entry.wishlistItemId))
      );
      showToast({
        title: 'Moved to cart',
        message: `${entry.name} moved to cart.`,
        variant: 'success',
      });
    } catch (err) {
      showToast({
        message: err?.message ?? 'Could not move wishlist item to cart.',
        variant: 'error',
      });
    } finally {
      setMovingId(null);
    }
  };

  const handleRemoveFromWishlist = async (entry) => {
    if (!entry?.productId || removingId != null) return;
    setRemovingId(entry.wishlistItemId);
    try {
      await deleteWishlistItem(entry.productId, entry.variantId);
      removeLocalWishlistItem(entry.productId, entry.variantId);
      setItems((prev) =>
        prev.filter((w) => String(w?.id) !== String(entry.wishlistItemId))
      );
      showToast({
        title: 'Removed from wishlist',
        message: `${entry.name} removed.`,
        variant: 'success',
      });
    } catch (err) {
      showToast({
        message: err?.message ?? 'Could not remove from wishlist.',
        variant: 'error',
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-brand text-xl text-primary">Wishlist</h1>
          <p className="mt-1 text-sm text-secondary/70">
            Save your favorites and move them to cart anytime.
          </p>
        </div>
        <p className="text-xs font-medium text-secondary/70">
          {normalizedItems.length} {normalizedItems.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-white" />
          ))}
        </div>
      ) : normalizedItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-tertiary/60" />
          <p className="mt-4 text-sm text-secondary">Your wishlist is empty.</p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-primary px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-white"
          >
            Browse collection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {normalizedItems.map((entry) => {
            const disabled = !entry.variantId || movingId === entry.wishlistItemId;
            const removeDisabled = !entry.productId || removingId === entry.wishlistItemId;
            return (
              <div
                key={entry.wishlistItemId}
                className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-border bg-gray-50">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} alt={entry.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-tertiary">
                        <ImageOff className="h-5 w-5 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/products/${encodeURIComponent(entry.slug ?? entry.productId)}`}
                      className="line-clamp-2 text-sm font-semibold text-primary hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <p className="mt-1 text-xs text-secondary/70">
                      {entry.categoryName || 'Apparel'} • Added {formatDate(entry.addedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(entry)}
                    disabled={disabled}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-accent-blush)] bg-[var(--color-accent-blush)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-[#f4d7c5] hover:border-[#f4d7c5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {movingId === entry.wishlistItemId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-3.5 w-3.5" />
                    )}
                    {!entry.variantId ? 'Unavailable' : 'Move to Cart'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveFromWishlist(entry)}
                    disabled={removeDisabled}
                    aria-label="Remove from wishlist"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-600 transition-colors hover:bg-red-100 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingId === entry.wishlistItemId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
