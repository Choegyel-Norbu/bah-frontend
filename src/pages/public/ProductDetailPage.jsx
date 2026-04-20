import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { getProductBySlug, getRelatedProducts } from '@/services/productService';
import { getProductReviews } from '@/services/reviewService';
import { addWishlistItem } from '@/services/wishlistService';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  ArrowLeft,
  Package,
  ImageOff,
  Loader2,
  ShoppingBag,
  Star,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';

/** Get initials from display name (e.g. "John Doe" → "JD", "Customer" → "C"). */
function getInitials(displayName) {
  const name = (displayName || 'C').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

/** Skeleton loader matching product detail layout (image left, info right). */
function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-gray-200" aria-hidden />
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Image area */}
        <div className="max-w-md mx-auto lg:mx-0 lg:max-w-none space-y-4">
          <div className="aspect-[3/4] w-full max-w-md mx-auto rounded-sm bg-gray-200 animate-pulse" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-20 shrink-0 rounded-sm bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Info area */}
        <div className="flex flex-col">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-9 w-4/5 max-w-md animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-3/4 max-w-sm animate-pulse rounded bg-gray-200" />
          <div className="mt-4 flex gap-4">
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="my-6 h-px w-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="mt-8 space-y-6">
            <div>
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200 mb-3" />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-14 animate-pulse rounded-md bg-gray-200" />
                ))}
              </div>
            </div>
            <div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mb-3" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-12 animate-pulse rounded-md bg-gray-200" />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <div className="h-12 w-32 animate-pulse rounded-full bg-gray-200" />
            <div className="h-12 flex-1 max-w-xs animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-200 pt-8">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
      {/* Reviews section skeleton */}
      <div className="mt-24 border-t border-gray-200 pt-16">
        <div className="mb-10 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="border-b border-gray-200 pb-8">
              <div className="flex justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="mt-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatPrice(value) {
  if (typeof value !== 'number') return String(value ?? '');
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const REVIEWS_PAGE_SIZE = 5;

function normalizeColorName(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim();
}

function getColorSwatchValue(color) {
  const key = normalizeColorName(color);

  const lookup = {
    black: '#000000',
    white: '#ffffff',
    ivory: '#f8f5ec',
    cream: '#f4efe4',
    beige: '#e3d4c5',
    taupe: '#b9aa9b',
    'iron gray': '#4a4f52',
    'iron grey': '#4a4f52',
    charcoal: '#33363a',
    grey: '#b3b6bd',
    gray: '#b3b6bd',
    navy: '#1b2738',
    'navy blue': '#1b2738',
    blue: '#335c99',
    teal: '#1e6f6e',
    green: '#2f4f3a',
    forest: '#233729',
    olive: '#5a5f39',
    burgundy: '#5b1821',
    wine: '#5b1821',
    maroon: '#5b1821',
    brown: '#6b4b2f',
    tan: '#c3a583',
    khaki: '#c1b18a',
    sand: '#ddc7a2',
    'light blue': '#cfe5f9',
    sky: '#cfe5f9',
    'baby blue': '#cfe5f9',
  };

  if (lookup[key]) return lookup[key];

  // If backend already sends a valid CSS color token, just use it
  return color || '#d1d5db';
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { show: showToast } = useToast();
  const { wishlistVariantIds, addLocalWishlistItem } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSizeOption, setSelectedSizeOption] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Reviews state
  const [reviewsPage, setReviewsPage] = useState({
    content: [],
    page: 0,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewPageIndex, setReviewPageIndex] = useState(0);

  // Fetch Product
  const fetchProduct = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProductBySlug(slug);
      setProduct(data);
      const groups = Array.isArray(data?.variantGroups)
        ? data.variantGroups.filter((g) => g && g.isActive !== false && g.active !== false)
        : [];
      const firstGroup = groups.length > 0 ? groups[0] : null;
      setSelectedGroup(firstGroup);
      const activeSizeOptions =
        firstGroup && Array.isArray(firstGroup.sizeOptions)
          ? firstGroup.sizeOptions.filter((s) => s && s.isActive !== false && s.active !== false)
          : [];
      const firstSize =
        activeSizeOptions.find((s) => (s.stockQuantity ?? 0) > 0) ?? activeSizeOptions[0] ?? null;
      setSelectedSizeOption(firstSize);
      setQuantity(1);
    } catch (err) {
      setError(err?.message ?? 'Product not found.');
      setProduct(null);
      setSelectedGroup(null);
      setSelectedSizeOption(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Scroll to reviews if hash present
  useEffect(() => {
    if (location.hash === '#reviews' && !loading && product) {
      const el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, loading, product]);

  // Fetch Related Products (You may also like) from /products/slug/{slug}/related
  useEffect(() => {
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      setRelatedProducts([]);
      return;
    }
    setRelatedLoading(true);
    getRelatedProducts(slug)
      .then((list) => setRelatedProducts(Array.isArray(list) ? list : []))
      .catch(() => setRelatedProducts([]))
      .finally(() => setRelatedLoading(false));
  }, [slug]);

  // Fetch Reviews
  const productId = product?.id != null ? Number(product.id) : null;
  const selectedVariantId = selectedSizeOption?.id != null ? Number(selectedSizeOption.id) : null;
  const wishlisted =
    selectedVariantId != null && wishlistVariantIds.has(String(selectedVariantId));
  const prevProductIdRef = useRef(null);
  const prevVariantIdRef = useRef(null);

  const fetchReviews = useCallback(
    (page = 0) => {
      if (productId == null) return;
      setReviewsLoading(true);
      setReviewsError(null);
      const params = { page, size: REVIEWS_PAGE_SIZE };
      if (selectedVariantId != null && !Number.isNaN(selectedVariantId)) {
        params.variantId = selectedVariantId;
      }
      getProductReviews(productId, params)
        .then((data) =>
          setReviewsPage({
            content: data.content ?? [],
            page: data.page ?? 0,
            totalElements: data.totalElements ?? 0,
            totalPages: data.totalPages ?? 0,
            last: data.last ?? true,
          })
        )
        .catch((err) => {
          setReviewsError(err?.message ?? 'Failed to load reviews.');
          setReviewsPage((prev) => ({ ...prev, content: [] }));
        })
        .finally(() => setReviewsLoading(false));
    },
    [productId, selectedVariantId]
  );

  useEffect(() => {
    if (productId == null) return;
    const isNewProduct = prevProductIdRef.current !== productId;
    const isNewVariant = prevVariantIdRef.current !== selectedVariantId;
    if (isNewProduct || isNewVariant) {
      prevProductIdRef.current = productId;
      prevVariantIdRef.current = selectedVariantId;
      setReviewPageIndex(0);
      fetchReviews(0);
      return;
    }
    fetchReviews(reviewPageIndex);
  }, [productId, selectedVariantId, reviewPageIndex, fetchReviews]);

  // Derived State
  const groups = Array.isArray(product?.variantGroups) ? product.variantGroups : [];
  const activeGroups = groups.filter((g) => g && g.isActive !== false && g.active !== false);
  const colors = [...new Set(activeGroups.map((g) => g.color).filter(Boolean))];
  const activeSizeOptions =
    selectedGroup && Array.isArray(selectedGroup.sizeOptions)
      ? selectedGroup.sizeOptions.filter((s) => s && s.isActive !== false && s.active !== false)
      : [];
  const sizes = [...new Set(activeSizeOptions.map((s) => s.size).filter(Boolean))];

  const actualPrice = selectedSizeOption != null && typeof selectedSizeOption.price === 'number'
    ? selectedSizeOption.price
    : product?.basePrice;
  // Use size-option discount when provided; otherwise fall back to product-level discount.
  // This matches the API response shape where `product.discount` may be present even when
  // some sizeOptions have discount = 0.
  const sizeDiscount = typeof selectedSizeOption?.discount === 'number' ? selectedSizeOption.discount : null;
  const productDiscount = typeof product?.discount === 'number' ? product.discount : 0;
  const discountAmount = sizeDiscount != null ? sizeDiscount : productDiscount;
  const hasDiscount = typeof discountAmount === 'number' && discountAmount > 0;
  const priceAfterDiscount = hasDiscount ? Math.max(0, actualPrice - discountAmount) : actualPrice;
  const displayPrice = priceAfterDiscount;
  const discountPercentOff =
    hasDiscount && typeof actualPrice === 'number' && actualPrice > 0
      ? Math.round((discountAmount / actualPrice) * 100)
      : null;
  
  // Image Logic — build gallery from selected color group's images[]
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const variantImages = (() => {
    const imgs = (selectedGroup?.images ?? [])
      .filter((img) => img && typeof img.imageUrl === 'string' && img.imageUrl.trim())
      .sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
    if (imgs.length > 0) return imgs;
    return [];
  })();

  const displayImage = variantImages[activeImageIndex]?.imageUrl ?? variantImages[0]?.imageUrl ?? null;

  // Reset image index when group changes
  const prevSelectedVariantIdForGallery = useRef(selectedGroup?.id);
  useEffect(() => {
    if (prevSelectedVariantIdForGallery.current !== selectedGroup?.id) {
      prevSelectedVariantIdForGallery.current = selectedGroup?.id;
      setActiveImageIndex(0);
    }
  }, [selectedGroup?.id]);

  const goToRelativeImage = (delta) => {
    if (variantImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + delta + variantImages.length) % variantImages.length);
  };
  
  const maxQty = selectedSizeOption != null && typeof selectedSizeOption.stockQuantity === 'number'
    ? Math.max(0, selectedSizeOption.stockQuantity)
    : 99;
  const canAddToCart = activeGroups.length === 0 || selectedSizeOption != null;
  const outOfStock = selectedSizeOption != null && (selectedSizeOption.stockQuantity ?? 0) <= 0;

  // Variant-scoped review count and average (only show rating when there are reviews)
  const variantReviewCount = reviewsPage.totalElements ?? 0;
  const variantAverageRating =
    variantReviewCount > 0 && reviewsPage.content.length > 0
      ? reviewsPage.content.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsPage.content.length
      : null;

  const handleAddToCart = async () => {
    if (!canAddToCart || outOfStock) return;
    if (activeGroups.length > 0 && selectedSizeOption) {
      setCartError(null);
      try {
        await addToCart(selectedSizeOption.id, quantity);
        setAddedToCart(true);
      } catch (err) {
        setCartError(err?.message ?? 'Failed to add to cart. Please try again.');
      }
    }
  };

  const handleAddToWishlist = async () => {
    if (!product?.id || selectedVariantId == null || addingToWishlist || outOfStock) return;

    if (!isAuthenticated) {
      showToast({
        message: 'Please sign in to add this product to wishlist.',
        variant: 'error',
      });
      navigate('/login');
      return;
    }

    setAddingToWishlist(true);
    try {
      await addWishlistItem(product.id, selectedVariantId);
      addLocalWishlistItem(product.id, selectedVariantId);
      showToast({ message: 'Added to wishlist', variant: 'success' });
    } catch (err) {
      if (err?.status === 409) {
        addLocalWishlistItem(product.id, selectedVariantId);
        // Backend conflict message may include productId; keep the toast human-friendly.
        showToast({ message: 'Already in your wishlist.', variant: 'success' });
      } else {
        showToast({ message: err?.message ?? 'Failed to add to wishlist.', variant: 'error' });
      }
    } finally {
      setAddingToWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <ProductDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <Package className="h-16 w-16 text-tertiary/50" />
          <h1 className="mt-4 text-2xl font-brand text-primary">Product Not Found</h1>
          <p className="mt-2 text-secondary/70">{error ?? 'This product may have been removed.'}</p>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb / Back */}
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Link
            to="/products"
            className="inline-flex min-h-10 items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary/60 hover:text-primary"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Collection
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-3 pb-20 sm:px-6 sm:pb-16 lg:px-8 lg:pb-0">
          {/* Mobile-first: keep color toggles above gallery for easier access */}
          {colors.length > 0 && (
            <section aria-label="Color options" className="mb-4 lg:hidden">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                    Staple Colors
                  </span>
                  {selectedGroup?.color && (
                    <span className="text-xs font-medium text-primary">
                      {selectedGroup.color}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="text-[11px] font-semibold uppercase tracking-wide text-secondary underline underline-offset-4 hover:text-primary"
                >
                  Color Notes
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2.5">
                {colors.map((color) => {
                  const group = activeGroups.find((g) => g.color === color);
                  const isSelected = selectedGroup?.color === color;
                  const swatchColor = getColorSwatchValue(color);

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        if (!group) return;
                        setSelectedGroup(group);
                        const activeSizeOptions = Array.isArray(group.sizeOptions)
                          ? group.sizeOptions.filter((s) => s && s.isActive !== false && s.active !== false)
                          : [];
                        const firstSize =
                          activeSizeOptions.find((s) => (s.stockQuantity ?? 0) > 0) ?? activeSizeOptions[0] ?? null;
                        setSelectedSizeOption(firstSize);
                      }}
                      className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-[1.03]"
                      aria-label={color}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm ${
                          isSelected ? 'ring-[3px] ring-black/80' : ''
                        }`}
                      >
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: swatchColor }}
                          aria-hidden="true"
                        />
                      </span>
                      {isSelected && (
                        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-black/60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:pb-0">
            
            {/* Left: Image Gallery */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-3 max-w-sm mx-auto lg:mx-0 sm:space-y-4"
            >
              <div className="relative aspect-[4/5] w-full max-w-sm mx-auto overflow-hidden rounded-sm bg-[#F0F0F0]">
                {(product.newArrival === true || product.new_arrival === true) && (
                  <span className="absolute left-4 top-4 z-10 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
                    New Arrival
                  </span>
                )}
                {hasDiscount && (
                  <span className="absolute left-4 top-4 z-10 translate-y-[28px] bg-primary/95 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                    Sale{discountPercentOff != null ? ` -${discountPercentOff}%` : ''}
                  </span>
                )}
                {outOfStock && (
                  <span className="absolute right-4 top-4 z-10 bg-red-600/95 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                    Out of Stock
                  </span>
                )}
                {displayImage ? (
                  <motion.img
                    key={displayImage}
                    src={displayImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.08, y: 8, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-tertiary">
                    <ImageOff className="h-12 w-12 opacity-30" />
                  </div>
                )}
                {variantImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToRelativeImage(-1)}
                      className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-r-full bg-white/80 text-primary shadow-sm ring-1 ring-border transition hover:bg-white hover:text-black"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToRelativeImage(1)}
                      className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-l-full bg-white/80 text-primary shadow-sm ring-1 ring-border transition hover:bg-white hover:text-black"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnail strip — all images for the selected variant */}
              {variantImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sm:gap-4">
                  {variantImages.map((img, imgIdx) => (
                    <button
                      key={img.id ?? imgIdx}
                      onClick={() => setActiveImageIndex(imgIdx)}
                      className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-sm border transition-all sm:w-20 ${
                        activeImageIndex === imgIdx
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.imageUrl} alt="" className="h-full w-full object-cover object-center" />
                    </button>
                  ))}
                </div>
              )}

              {/* Removed: variant thumbnail strip. Color selection below drives the gallery thumbnails. */}
            </motion.div>

            {/* Right: Product Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col lg:pl-2"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-secondary/60 sm:mb-2 sm:text-sm">
                {product.categoryName && (
                  <Link to={`/products?category=${product.categorySlug}`} className="hover:text-primary hover:underline">
                    {product.categoryName}
                  </Link>
                )}
                {product.brand && (
                  <>
                    <span>•</span>
                    <span>{product.brand}</span>
                  </>
                )}
              </div>

              <h1 className="font-brand text-xl text-primary sm:text-2xl lg:text-3xl">
                {product.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-baseline gap-3 sm:mt-4 sm:gap-4">
                <p className="text-xl font-medium text-primary sm:text-2xl">
                  Nu {formatPrice(displayPrice)}
                </p>
                {hasDiscount && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Save {discountPercentOff != null ? `${discountPercentOff}%` : formatPrice(discountAmount)}
                    </span>
                    <p className="text-base text-secondary/50 line-through sm:text-lg">
                      Nu {formatPrice(actualPrice)}
                    </p>
                  </>
                )}
              </div>

              {/* Rating (variant-scoped; no stars when 0 reviews) */}
              <div className="mt-3 flex items-center gap-2 sm:mt-4">
                <div className="flex text-blue-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                        variantAverageRating != null && star <= variantAverageRating
                          ? 'fill-blue-500 text-blue-500'
                          : 'fill-gray-300 text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <a href="#reviews" className="text-xs text-secondary underline underline-offset-4 hover:text-primary sm:text-sm">
                  {reviewsLoading ? '…' : variantReviewCount} Reviews
                </a>
              </div>

              <div className="my-4 h-px w-full bg-border sm:my-6" />

              {/* Description */}
              <div className="text-xs leading-relaxed text-secondary/80 sm:text-sm">
                <p>{product.description}</p>
              </div>

              {/* Options */}
              <div className="mt-6 space-y-6 border-y border-border py-6 sm:mt-8 sm:space-y-8 sm:py-8">
                {/* Colors */}
                {colors.length > 0 && (
                  <section aria-label="Color options" className="hidden lg:block">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary sm:text-xs">
                          Staple Colors
                        </span>
                        {selectedGroup?.color && (
                          <span className="text-xs font-medium text-primary sm:text-sm">
                            {selectedGroup.color}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-[10px] font-semibold tracking-wide text-secondary underline underline-offset-4 hover:text-primary sm:text-[11px]"
                      >
                        COLOR NOTES
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2.5 sm:mt-4 sm:gap-3">
                      {colors.map((color) => {
                        const group = activeGroups.find((g) => g.color === color);
                        const isSelected = selectedGroup?.color === color;
                        const swatchColor = getColorSwatchValue(color);

                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              if (!group) return;
                              setSelectedGroup(group);
                              const activeSizeOptions = Array.isArray(group.sizeOptions)
                                ? group.sizeOptions.filter((s) => s && s.isActive !== false && s.active !== false)
                                : [];
                              const firstSize =
                                activeSizeOptions.find((s) => (s.stockQuantity ?? 0) > 0) ?? activeSizeOptions[0] ?? null;
                              setSelectedSizeOption(firstSize);
                            }}
                            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-[1.03] sm:h-10 sm:w-10"
                            aria-label={color}
                          >
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm sm:h-8 sm:w-8 ${
                                isSelected ? 'ring-[3px] ring-black/80' : ''
                              }`}
                            >
                              <span
                                className="h-5 w-5 rounded-full sm:h-5.5 sm:w-5.5"
                                style={{ backgroundColor: swatchColor }}
                                aria-hidden="true"
                              />
                            </span>
                            {isSelected && (
                              <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-black/60" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Sizes */}
                {sizes.length > 0 && (
                  <section aria-label="Size options">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary sm:text-xs">
                          Size
                        </span>
                        {selectedSizeOption?.size && (
                          <span className="text-xs font-medium text-primary sm:text-sm">
                            {selectedSizeOption.size}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-[10px] font-semibold tracking-wide text-secondary underline underline-offset-4 hover:text-primary sm:text-[11px]"
                      >
                        SIZE GUIDE
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2.5 sm:mt-4 sm:gap-3">
                      {sizes.map((size) => {
                        const option = activeSizeOptions.find((s) => s.size === size) ?? null;
                        const isSelected = selectedSizeOption?.size === size;
                        const hasOption = !!option;
                        const isSoldOut = hasOption && (option.stockQuantity ?? 0) <= 0;
                        // Keep sold-out sizes clickable (to switch selection), but disable selection only when the option doesn't exist.
                        const disabled = !hasOption;
                        const optionDiscount =
                          option && typeof option.discount === 'number' ? option.discount : 0;
                        const isOnSaleOption = optionDiscount > 0;
                        const optionDiscountPercentOff =
                          isOnSaleOption && typeof option.price === 'number' && option.price > 0
                            ? Math.round((optionDiscount / option.price) * 100)
                            : null;

                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => option && setSelectedSizeOption(option)}
                            disabled={disabled}
                            className={`flex h-10 min-w-[2.75rem] items-center justify-center rounded-none border px-3 text-xs font-medium tracking-wide transition-colors sm:h-11 sm:min-w-[3rem] sm:px-4 sm:text-sm ${
                              isSelected
                                ? isOnSaleOption
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-black text-primary'
                                : isSoldOut
                                  ? 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                                  : isOnSaleOption
                                    ? 'border-primary/60 bg-primary/5 text-primary hover:border-primary'
                                    : 'border-gray-200 text-secondary hover:border-black hover:text-primary'
                            }`}
                            aria-pressed={isSelected}
                          >
                            <span className="flex items-center gap-2">
                              {size}
                              {isSoldOut && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-green-700">
                                  SOLD OUT
                                </span>
                              )}
                              {isOnSaleOption && (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  SALE{optionDiscountPercentOff != null ? ` ${optionDiscountPercentOff}%` : ''}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Actions: hidden on small screens; sticky bar below is the only Add to Cart on mobile */}
              <div className="mt-8 hidden flex-col gap-6 lg:flex lg:flex-row lg:gap-4">
                {/* Quantity */}
                <div className="flex h-12 w-32 items-center justify-between rounded-full border border-border px-4">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="text-secondary hover:text-primary"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-medium text-primary">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, Math.min(maxQty, q + 1)))}
                    className="text-secondary hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || outOfStock}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-bold uppercase leading-none tracking-wide text-white transition-colors hover:bg-[#1f201f] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>

                <button
                  type="button"
                  onClick={handleAddToWishlist}
                  disabled={addingToWishlist || outOfStock}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-sm font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    wishlisted
                      ? 'border-pink-500/30 bg-pink-500/5 text-pink-600'
                      : 'border-border bg-white text-secondary hover:border-primary hover:text-primary'
                  }`}
                >
                  {addingToWishlist ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className={`h-4 w-4 ${wishlisted ? 'fill-pink-500 text-pink-600' : ''}`} />
                  )}
                  {wishlisted ? 'Wishlisted' : 'Wishlist'}
                </button>
              </div>

              {cartError && (
                <p className="mt-2 text-sm text-red-600">{cartError}</p>
              )}

              {/* Trust Badges */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-6 text-xs text-secondary sm:mt-8 sm:gap-4 sm:pt-8 sm:text-sm">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Truck className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                  <span>Hassle‑free returns within 14 days</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                  <span>Secure payment</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sticky Add to Cart bar on mobile (duplicate CTA for thumb-friendly access) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex h-10 w-24 items-center justify-between rounded-full border border-border px-2 sm:w-28">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-medium text-primary">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, Math.min(maxQty, q + 1)))}
                className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAddToCart || outOfStock}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 text-xs font-bold uppercase leading-none tracking-wide text-white transition-colors hover:bg-[#1f201f] disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
            >
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              type="button"
              onClick={handleAddToWishlist}
              disabled={addingToWishlist || outOfStock}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
                wishlisted
                  ? 'border-pink-500/30 bg-pink-500/5 text-pink-600'
                  : 'border-border bg-white text-secondary hover:border-primary hover:text-primary'
              }`}
              aria-label={wishlisted ? 'Already in wishlist' : 'Add to wishlist'}
            >
              {addingToWishlist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${wishlisted ? 'fill-pink-500 text-pink-600' : ''}`} />
              )}
            </button>
          </div>

          {/* Reviews Section */}
          <div id="reviews" className="mt-12 border-t border-border pt-10 sm:mt-24 sm:pt-16">
            <div className="mb-6 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-brand text-xl text-primary sm:text-2xl lg:text-3xl">Customer Reviews</h2>
              <div className="flex items-center gap-2">
                {variantAverageRating != null ? (
                  <>
                    <span className="text-lg font-bold text-primary sm:text-2xl">{Number(variantAverageRating).toFixed(1)}</span>
                    <div className="flex text-blue-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${star <= variantAverageRating ? 'fill-blue-500 text-blue-500' : 'fill-gray-300 text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-secondary sm:text-sm">No rating</span>
                )}
                <span className="text-xs text-secondary sm:text-sm">({reviewsLoading ? '…' : variantReviewCount})</span>
              </div>
            </div>

            {reviewsLoading ? (
               <div className="flex justify-center py-12">
                 <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
               </div>
            ) : reviewsPage.content.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-6 text-center sm:p-8">
                <p className="text-sm text-secondary sm:text-base">No reviews yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                {reviewsPage.content.map((review) => (
                  <div key={review.id} className="border-b border-border pb-6 last:border-0 sm:pb-8">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-semibold text-primary/80 sm:h-9 sm:w-9 sm:text-sm"
                          aria-hidden
                        >
                          {getInitials(review.userDisplayName)}
                        </span>
                        <span className="text-sm font-bold text-primary sm:text-base">
                          {review.userDisplayName || 'Customer'}
                        </span>
                        {review.verifiedPurchase && (
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-green-600">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-secondary/60">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex text-blue-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${star <= review.rating ? 'fill-blue-500 text-blue-500' : 'fill-gray-300 text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-secondary sm:mt-3 sm:text-sm">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {reviewsPage.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2 sm:mt-8">
                <button
                  type="button"
                  onClick={() => setReviewPageIndex((p) => Math.max(0, p - 1))}
                  disabled={reviewsPage.page === 0}
                  className="min-h-10 rounded-full border border-border px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setReviewPageIndex((p) => p + 1)}
                  disabled={reviewsPage.last}
                  className="min-h-10 rounded-full border border-border px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 border-t border-border pt-10 pb-16 sm:mt-24 sm:pt-16 sm:pb-24">
              <h2 className="mb-6 font-brand text-xl text-primary sm:mb-10 sm:text-2xl lg:text-3xl">You May Also Like</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Added to Cart Modal */}
      <AnimatePresence>
        {addedToCart && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddedToCart(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-primary">Added to Bag</h3>
                <p className="mt-2 text-sm text-secondary">
                  {product?.name} is now in your cart.
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  <Link
                    to="/cart"
                    className="flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-secondary"
                  >
                    View Cart
                  </Link>
                  <button
                    onClick={() => setAddedToCart(false)}
                    className="w-full text-sm font-medium text-secondary hover:text-primary"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
