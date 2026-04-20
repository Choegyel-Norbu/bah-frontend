import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrderByNumber } from '@/services/orderService';
import {
  createReview,
  updateReview,
  deleteReview,
  getMyProductReview,
} from '@/services/reviewService';
import { getProductBySlug, getProductSuggestions } from '@/services/productService';
import { useAuth } from '@/context/AuthContext';
import { 
  Package, 
  Loader2, 
  ArrowLeft, 
  MessageSquare, 
  Star, 
  Pencil, 
  Trash2, 
  MapPin, 
  CreditCard,
  Calendar,
  Truck
} from 'lucide-react';

function formatPrice(value) {
  if (typeof value !== 'number') return '—';
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }) {
  const statusLower = (status || '').toLowerCase();
  const colors =
    statusLower === 'cancelled' || statusLower === 'returned'
      ? 'bg-red-50 text-red-700 border-red-100'
      : statusLower === 'delivered'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : statusLower === 'shipped'
          ? 'bg-blue-50 text-blue-700 border-blue-100'
          : statusLower === 'processing'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-gray-50 text-gray-700 border-gray-100';
            
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${colors}`}>
      {status || '—'}
    </span>
  );
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review state
  const [expandedReviewProductId, setExpandedReviewProductId] = useState(null);
  const [expandedReviewVariantId, setExpandedReviewVariantId] = useState(null);
  const [expandedReviewScopeKey, setExpandedReviewScopeKey] = useState(null);
  const [expandedReviewItemKey, setExpandedReviewItemKey] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewDeletingId, setReviewDeletingId] = useState(null);
  // key: `${productId}:${group-color-or-fallback}` -> review
  const [myReviewsByScopeKey, setMyReviewsByScopeKey] = useState({});
  const [resolvedProductIdBySlug, setResolvedProductIdBySlug] = useState({});
  const [resolvedItemInfo, setResolvedItemInfo] = useState({});
  const [resolvingSlugForReview, setResolvingSlugForReview] = useState(null);

  // Always start from the top when the order detail page is loaded or order changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber) {
      setError('Order number is missing.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrderByNumber(orderNumber)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load order.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderNumber]);

  const items = order?.items ?? [];
  const orderStatus = String(order?.status ?? '').trim().toUpperCase();
  const canReview = orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED';
  const userId = user?.id != null ? String(user.id) : null;

  const makeReviewKey = (productId, variantId) => {
    const id = Number(productId);
    const vId = variantId != null ? Number(variantId) : null;
    return `${Number.isNaN(id) ? '' : id}:${vId != null && !Number.isNaN(vId) ? vId : 'null'}`;
  };

  const makeReviewScopeKey = (productId, color, size, variantId) => {
    const id = Number(productId);
    const vId = variantId != null ? Number(variantId) : null;
    // Prefer concrete variant-level scope so each size can have its own review.
    if (vId != null && !Number.isNaN(vId)) {
      return `${Number.isNaN(id) ? '' : id}:variant:${vId}`;
    }

    const normalizedColor = String(color ?? '').trim().toLowerCase();
    const normalizedSize = String(size ?? '').trim().toLowerCase();
    if (normalizedColor || normalizedSize) {
      return `${Number.isNaN(id) ? '' : id}:opt:${normalizedColor || 'na'}:${normalizedSize || 'na'}`;
    }
    return makeReviewKey(productId, variantId);
  };

  const collectVariantCandidates = useCallback((payload) => {
    const list = [];
    const pushCandidate = (raw) => {
      if (!raw || raw.id == null || Number.isNaN(Number(raw.id))) return;
      list.push({
        id: Number(raw.id),
        sku: raw.sku ?? null,
        size: raw.size ?? null,
        color: raw.color ?? null,
      });
    };

    const legacyVariants = Array.isArray(payload?.variants) ? payload.variants : [];
    legacyVariants.forEach(pushCandidate);

    const groups = Array.isArray(payload?.variantGroups) ? payload.variantGroups : [];
    groups.forEach((g) => {
      const sizeOptions = Array.isArray(g?.sizeOptions) ? g.sizeOptions : [];
      sizeOptions.forEach((s) =>
        pushCandidate({
          ...s,
          color: s?.color ?? g?.color,
        })
      );
    });

    return list;
  }, []);

  const resolveVariantIdFromCandidates = useCallback((item, candidates) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    if (item?.sku) {
      const bySku = candidates.find((v) => String(v.sku || '').toLowerCase() === String(item.sku).toLowerCase());
      if (bySku) return Number(bySku.id);
    }
    if (item?.size || item?.color) {
      const byAttrs = candidates.find(
        (v) =>
          (!item.size || String(v.size || '').toLowerCase() === String(item.size).toLowerCase()) &&
          (!item.color || String(v.color || '').toLowerCase() === String(item.color).toLowerCase())
      );
      if (byAttrs) return Number(byAttrs.id);
    }
    return null;
  }, []);

  // Load existing reviews per product/variant for this order when viewing details.
  // Order items may lack productId/variantId, so resolve them from product name + SKU/size/color.
  useEffect(() => {
    if (!order || !canReview || !userId) return;
    const orderItems = order.items ?? [];
    if (orderItems.length === 0) return;

    let cancelled = false;

    (async () => {
      const uniqueNames = [
        ...new Set(
          orderItems
            .filter((i) => i.productName)
            .map((i) => i.productName)
        ),
      ];

      const productDataByName = {};
      if (uniqueNames.length > 0) {
        await Promise.all(
          uniqueNames.map(async (name) => {
            try {
              const results = await getProductSuggestions({ q: name, limit: 5 });
              const match =
                results.find((r) => r.name?.toLowerCase().trim() === name.toLowerCase().trim()) ??
                results[0];
              if (!match?.id) return;
              let variants = collectVariantCandidates(match);
              if (variants.length === 0 && match.slug) {
                try {
                  const full = await getProductBySlug(match.slug);
                  variants = collectVariantCandidates(full);
                } catch {
                  /* use suggestion data as-is */
                }
              }
              productDataByName[name] = {
                productId: Number(match.id),
                slug: match.slug ?? null,
                variants,
              };
            } catch {
              /* skip unresolvable products */
            }
          })
        );
      }

      if (cancelled) return;

      const infoMap = {};
      const reviewTasks = [];
      const seenScopeKeys = new Set();

      orderItems.forEach((item, idx) => {
        const itemKey = item.id ?? idx;
        let productId = null;
        let variantId = null;
        let slug = null;

        const rawPid = item.productId ?? item.product_id;
        if (rawPid != null && !Number.isNaN(Number(rawPid))) {
          productId = Number(rawPid);
          const rawVid = item.variantId ?? item.productVariantId ?? item.variant_id ?? null;
          variantId = rawVid != null ? Number(rawVid) : null;
          slug = item.productSlug ?? item.product_slug ?? null;
        } else if (item.productName && productDataByName[item.productName]) {
          const resolved = productDataByName[item.productName];
          productId = resolved.productId;
          slug = resolved.slug;
          const resolvedVariantId = resolveVariantIdFromCandidates(item, resolved.variants);
          if (resolvedVariantId != null && !Number.isNaN(resolvedVariantId)) {
            variantId = Number(resolvedVariantId);
          }
        } else if (variantId == null && item.productName && productDataByName[item.productName]) {
          const resolved = productDataByName[item.productName];
          const resolvedVariantId = resolveVariantIdFromCandidates(item, resolved.variants);
          if (resolvedVariantId != null && !Number.isNaN(resolvedVariantId)) {
            variantId = Number(resolvedVariantId);
          }
        }

        if (productId != null && !Number.isNaN(productId)) {
          const scopeKey = makeReviewScopeKey(productId, item.color, item.size, variantId);
          infoMap[itemKey] = { productId, variantId, slug, scopeKey };
          if (!seenScopeKeys.has(scopeKey)) {
            seenScopeKeys.add(scopeKey);
            reviewTasks.push(
              getMyProductReview(productId, { variantId })
                .then((review) => ({ scopeKey, review }))
                .catch(() => null)
            );
          }
        }
      });

      setResolvedItemInfo(infoMap);

      if (reviewTasks.length === 0 || cancelled) return;

      const results = await Promise.all(reviewTasks);
      if (cancelled) return;

      setMyReviewsByScopeKey((prev) => {
        const next = { ...prev };
        results.forEach((res) => {
          if (res?.review) next[res.scopeKey] = res.review;
        });
        return next;
      });
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [order?.orderNumber, canReview, userId, collectVariantCandidates, resolveVariantIdFromCandidates]);

  const openReviewForm = useCallback((itemKey, productId, existingReview, variantId = null, scopeKey = null) => {
    setExpandedReviewItemKey(itemKey ?? null);
    setExpandedReviewProductId(productId);
    setExpandedReviewVariantId(variantId != null && !Number.isNaN(Number(variantId)) ? Number(variantId) : null);
    setExpandedReviewScopeKey(scopeKey ?? null);
    setReviewError(null);
    if (existingReview) {
      setReviewForm({ rating: existingReview.rating, comment: (existingReview.comment ?? '').trim() });
    } else {
      setReviewForm({ rating: 5, comment: '' });
    }
  }, []);

  const closeReviewForm = useCallback(() => {
    setExpandedReviewItemKey(null);
    setExpandedReviewProductId(null);
    setExpandedReviewVariantId(null);
    setExpandedReviewScopeKey(null);
    setReviewError(null);
  }, []);

  const openReviewFormForItem = useCallback(
    async (item, itemKey) => {
      const resolvedKey = itemKey ?? item?.id;
      const info = resolvedKey != null ? resolvedItemInfo[resolvedKey] : undefined;
      if (info?.productId) {
        openReviewForm(
          resolvedKey,
          info.productId,
          myReviewsByScopeKey[info.scopeKey] ?? null,
          info.variantId,
          info.scopeKey
        );
        return;
      }

      const rawId = item.productId ?? item.product_id;
      const slug = item.productSlug ?? item.product_slug;
      const rawVariantId = item.variantId ?? item.productVariantId ?? item.variant_id ?? null;
      const variantId = rawVariantId != null ? Number(rawVariantId) : null;
      let id = rawId != null ? Number(rawId) : null;
      const scopeKeyFromRow = id != null ? makeReviewScopeKey(id, item.color, item.size, variantId) : null;
      if (id != null && !Number.isNaN(id)) {
        openReviewForm(resolvedKey, id, myReviewsByScopeKey[scopeKeyFromRow] ?? null, variantId, scopeKeyFromRow);
        return;
      }
      if (slug != null && String(slug).trim()) {
        setReviewError(null);
        setResolvingSlugForReview(slug);
        try {
          const product = await getProductBySlug(String(slug).trim());
          const resolvedId = product?.id != null ? Number(product.id) : null;
          if (resolvedId != null && !Number.isNaN(resolvedId)) {
            setResolvedProductIdBySlug((prev) => ({ ...prev, [slug]: resolvedId }));
            const scopeKey = makeReviewScopeKey(resolvedId, item.color, item.size, variantId);
            openReviewForm(resolvedKey, resolvedId, myReviewsByScopeKey[scopeKey] ?? null, variantId, scopeKey);
          } else {
            setReviewError('Could not load product. Try opening the product page to review.');
          }
        } catch {
          setReviewError('Could not load product. Try opening the product page to review.');
        } finally {
          setResolvingSlugForReview(null);
        }
        return;
      }
      setReviewError('Product link is missing.');
    },
    [openReviewForm, myReviewsByScopeKey, resolvedItemInfo]
  );

  const handleReviewSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const id = Number(expandedReviewProductId);
      if (Number.isNaN(id)) return;
      if (expandedReviewVariantId == null || Number.isNaN(Number(expandedReviewVariantId))) {
        setReviewError('Variant ID is missing for this item. Please reopen the review from the item row.');
        return;
      }
      setReviewError(null);
      setReviewSubmitting(true);
      try {
        const scopeKey =
          expandedReviewScopeKey ??
          makeReviewKey(id, expandedReviewVariantId);
        const myReview = myReviewsByScopeKey[scopeKey];
        if (myReview) {
          const updated = await updateReview(id, myReview.id, {
            rating: reviewForm.rating,
            comment: reviewForm.comment,
          });
          setMyReviewsByScopeKey((prev) => ({ ...prev, [scopeKey]: updated }));
        } else {
          const created = await createReview(id, {
            rating: reviewForm.rating,
            comment: reviewForm.comment,
            variantId: expandedReviewVariantId,
          });
          setMyReviewsByScopeKey((prev) => ({ ...prev, [scopeKey]: created }));
        }
        setExpandedReviewItemKey(null);
        setExpandedReviewProductId(null);
        setExpandedReviewVariantId(null);
        setExpandedReviewScopeKey(null);
        setReviewForm({ rating: 5, comment: '' });
      } catch (err) {
        setReviewError(err?.message ?? 'Failed to save review.');
      } finally {
        setReviewSubmitting(false);
      }
    },
    [
      reviewForm.rating,
      reviewForm.comment,
      myReviewsByScopeKey,
      expandedReviewProductId,
      expandedReviewVariantId,
      expandedReviewScopeKey,
    ]
  );

  const handleReviewDelete = useCallback(async (productId, reviewId) => {
    const id = Number(productId);
    if (Number.isNaN(id)) return;
    setReviewDeletingId(reviewId);
    setReviewError(null);
    try {
      await deleteReview(id, reviewId);
      setMyReviewsByScopeKey((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([key, value]) => {
          if (value && value.id === reviewId) {
            delete next[key];
          }
        });
        return next;
      });
      setExpandedReviewItemKey(null);
      setExpandedReviewProductId(null);
      setExpandedReviewVariantId(null);
      setExpandedReviewScopeKey(null);
    } catch (err) {
      setReviewError(err?.message ?? 'Failed to delete review.');
    } finally {
      setReviewDeletingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-32 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-full bg-gray-100" />
            <div className="h-4 w-40 rounded-full bg-gray-100" />
          </div>
        </div>

        {/* Content skeleton: items + summary */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded-full bg-gray-100" />
                  <div className="h-3 w-1/3 rounded-full bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-16 rounded-full bg-gray-100" />
                    <div className="h-3 w-10 rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="h-4 w-24 rounded-full bg-gray-100" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between gap-3">
                  <div className="h-3 w-20 rounded-full bg-gray-100" />
                  <div className="h-3 w-12 rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Package className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-medium text-primary">{error ?? 'Order not found'}</h2>
        <Link
          to="/account/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-4">
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-brand text-3xl text-primary">
              Order #{order.orderNumber ?? order.id}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-secondary">
              <Calendar className="h-4 w-4 text-tertiary" />
              Placed on {formatDate(order.createdAt ?? order.created_at)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content - Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border bg-gray-50/50 px-6 py-4">
              <h2 className="font-medium text-primary">Items ({items.length})</h2>
            </div>
            <ul className="divide-y divide-border">
              {items.map((item, idx) => {
                const itemKey = item.id ?? idx;
                const info = resolvedItemInfo[itemKey];
                const rawId = item.productId ?? item.product_id;
                const productSlug = info?.slug ?? item.productSlug ?? item.product_slug ?? rawId;
                const productPath = productSlug != null ? `/products/${encodeURIComponent(String(productSlug))}` : null;
                const rawVariantIdForRow = item.variantId ?? item.productVariantId ?? item.variant_id ?? null;
                const idFromItem = rawId != null ? Number(rawId) : null;
                const id = info?.productId
                  ?? ((idFromItem != null && !Number.isNaN(idFromItem)) ? idFromItem : null)
                  ?? (productSlug != null ? resolvedProductIdBySlug[productSlug] : null);
                const variantId = info?.variantId
                  ?? (rawVariantIdForRow != null ? Number(rawVariantIdForRow) : null);
                const scopeKey = id != null ? makeReviewScopeKey(id, item.color, item.size, variantId) : null;
                const myReview = scopeKey != null ? myReviewsByScopeKey[scopeKey] : null;
                const isFormExpanded = expandedReviewItemKey === itemKey;
                const isResolving = resolvingSlugForReview === (item.productSlug ?? item.product_slug);

                return (
                  <li key={item.id ?? idx} className="p-6">
                    <div className="flex gap-4 sm:gap-6">
                      {/* Product Image Placeholder or Actual */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-gray-50 sm:h-24 sm:w-24">
                        {item.imageUrl || item.image_url ? (
                          <img 
                            src={item.imageUrl || item.image_url} 
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-tertiary">
                            <Package className="h-8 w-8 opacity-20" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-primary">
                              {productPath ? (
                                <Link to={productPath} className="hover:underline">
                                  {item.productName ?? item.product_name ?? 'Product'}
                                </Link>
                              ) : (
                                item.productName ?? item.product_name ?? 'Product'
                              )}
                            </h3>
                            <p className="mt-1 text-sm text-secondary">
                              {[item.size, item.color].filter(Boolean).join(' · ')}
                              {item.sku && <span className="text-tertiary"> · {item.sku}</span>}
                            </p>
                          </div>
                          <p className="text-right font-medium text-primary">
                            Nu {formatPrice(item.totalPrice ?? item.total_price)}
                          </p>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-xs text-secondary">
                            Qty: {item.quantity ?? 0} × Nu {formatPrice(item.unitPrice ?? item.unit_price)}
                          </p>
                          
                          {canReview && !isFormExpanded && !myReview && (
                            <button
                              onClick={() => openReviewFormForItem(item, itemKey)}
                              disabled={isResolving}
                              className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary disabled:opacity-50"
                            >
                              {isResolving ? 'Loading...' : 'Write Review'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Review Section */}
                    <AnimatePresence>
                      {(isFormExpanded || myReview) && canReview && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-lg bg-gray-50/50 p-4">
                            {myReview && !isFormExpanded ? (
                              <div className="flex gap-4">
                                <div className="shrink-0">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-500">
                                    <Star className="h-4 w-4 fill-current" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-primary">Your Review</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openReviewForm(itemKey, id, myReview, variantId, scopeKey)}
                                        className="p-1 text-secondary hover:text-primary"
                                        title="Edit review"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleReviewDelete(id, myReview.id)}
                                        disabled={reviewDeletingId === myReview.id}
                                        className="p-1 text-secondary hover:text-red-600 disabled:opacity-50"
                                        title="Delete review"
                                      >
                                        {reviewDeletingId === myReview.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex text-blue-500">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`h-3 w-3 ${s <= myReview.rating ? 'fill-blue-500 text-blue-500' : 'fill-transparent text-gray-300'}`} />
                                    ))}
                                  </div>
                                  {myReview.comment && (
                                    <p className="mt-2 text-sm text-secondary">{myReview.comment}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <form onSubmit={handleReviewSubmit}>
                                <div className="mb-4">
                                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">Rating</label>
                                  <div className="mt-2 flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                                        className="focus:outline-none"
                                      >
                                        <Star
                                          className={`h-5 w-5 transition-colors ${
                                            reviewForm.rating >= star ? 'fill-blue-500 text-blue-500' : 'text-gray-300 hover:text-blue-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="mb-4">
                                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">Review</label>
                                  <textarea
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-border bg-white p-3 text-sm text-primary placeholder:text-tertiary focus:border-primary focus:outline-none focus:ring-0"
                                    placeholder="How was the product?"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    type="submit"
                                    disabled={reviewSubmitting}
                                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-secondary disabled:opacity-50 shadow-none"
                                  >
                                    {reviewSubmitting ? 'Saving...' : 'Submit Review'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={closeReviewForm}
                                    className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {reviewError && (
                                  <p className="mt-3 text-xs text-red-600">{reviewError}</p>
                                )}
                              </form>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 font-brand text-lg text-primary">Order Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between text-secondary">
                <dt>Subtotal</dt>
                <dd>Nu {formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-secondary">
                <dt>Shipping</dt>
                <dd>{order.shippingCost > 0 ? `Nu ${formatPrice(order.shippingCost)}` : 'Free'}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>- Nu {formatPrice(order.discount)}</dd>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between text-secondary">
                  <dt>Tax</dt>
                  <dd>Nu {formatPrice(order.tax)}</dd>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold text-primary text-base">
                <dt>Total</dt>
                <dd>Nu {formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 font-brand text-lg text-primary">Delivery Details</h2>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-secondary" />
              <div className="text-sm text-secondary">
                <p className="font-medium text-primary">Shipping Address</p>
                {/* Assuming shippingAddress is available or falling back to generic text if structure unknown */}
                {order.shippingAddress ? (
                  <div className="mt-1 space-y-0.5">
                    <p>{order.shippingAddress.streetAddress}</p>
                    <p>{[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                ) : (
                  <p className="mt-1 italic text-tertiary">Address details not available</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-secondary" />
              <div className="text-sm text-secondary">
                <p className="font-medium text-primary">Payment Method</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-secondary">
                  ONLINE PAYMENT
                </p>
              </div>
            </div>
            {order.status === 'SHIPPED' && (
              <div className="mt-6 flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 text-secondary" />
                <div className="text-sm text-secondary">
                  <p className="font-medium text-primary">Shipping Status</p>
                  <p className="mt-1">On the way</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
