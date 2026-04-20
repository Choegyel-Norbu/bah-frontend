import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  ShoppingCart,
  Trash2,
  ImageOff,
  ArrowRight,
  Minus,
  Plus,
  ArrowLeft
} from 'lucide-react';

function formatPrice(value) {
  if (typeof value !== 'number') return String(value ?? '');
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const {
    items,
    subtotal,
    totalItems,
    fetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const { show: showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && fetchCart) {
      (async () => {
        try {
          await fetchCart();
        } finally {
          if (!cancelled) {
            setInitialLoading(false);
          }
        }
      })();
    } else {
      setInitialLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchCart]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1) return;
    setError(null);
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, newQty);
    } catch (err) {
      setError(err?.message ?? 'Failed to update quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveClick = (item) => setItemToRemove(item);

  const handleRemoveConfirm = async () => {
    if (!itemToRemove) return;
    const itemId = itemToRemove.id;
    const productName = itemToRemove.productName;
    setItemToRemove(null);
    setError(null);
    setUpdatingId(itemId);
    try {
      await removeFromCart(itemId);
      showToast({
        title: 'Removed',
        message: `${productName} removed from cart.`,
        variant: 'success',
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to remove item.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCartConfirm = async () => {
    setShowClearCartConfirm(false);
    setError(null);
    setClearing(true);
    try {
      await clearCart();
      showToast({
        title: 'Cart cleared',
        message: 'All items removed.',
        variant: 'success',
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to clear cart.');
    } finally {
      setClearing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <ShoppingCart className="h-16 w-16 text-tertiary/50" strokeWidth={1} />
          <h1 className="mt-6 font-brand text-3xl text-primary">Your Bag is Empty</h1>
          <p className="mt-2 text-secondary/70">Sign in to view your saved items.</p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-secondary"
          >
            Sign In
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
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:h-[calc(100vh-96px)] lg:overflow-hidden lg:flex lg:flex-col">
          <div className="flex items-end justify-between border-b border-border pb-4">
            <h1 className="font-brand text-3xl text-primary">Shopping Bag</h1>
            <p className="text-xs font-medium text-secondary">
              {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-10">
              {/* Skeleton Cart Items */}
              <div className="lg:col-span-8 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex py-6 border-b border-border/70 last:border-b-0"
                  >
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-gray-100 sm:h-28 sm:w-24" />
                    <div className="ml-4 flex flex-1 flex-col justify-between">
                      <div className="flex justify-between gap-4">
                        <div className="space-y-2">
                          <div className="h-4 w-40 rounded-full bg-gray-100" />
                          <div className="h-3 w-24 rounded-full bg-gray-100" />
                        </div>
                        <div className="h-4 w-16 rounded-full bg-gray-100" />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-border px-3 py-1 gap-3">
                          <div className="h-3 w-3 rounded-full bg-gray-100" />
                          <div className="h-3 w-6 rounded-full bg-gray-100" />
                          <div className="h-3 w-3 rounded-full bg-gray-100" />
                        </div>
                        <div className="h-3 w-16 rounded-full bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Skeleton Order Summary */}
              <div className="mt-10 rounded-xl bg-gray-50 p-6 lg:col-span-4 lg:mt-0">
                <div className="h-4 w-32 rounded-full bg-gray-100" />
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 rounded-full bg-gray-100" />
                    <div className="h-3 w-12 rounded-full bg-gray-100" />
                  </div>
                  <div className="flex justify-between border-t border-border pt-4">
                    <div className="h-3 w-20 rounded-full bg-gray-100" />
                    <div className="h-4 w-16 rounded-full bg-gray-100" />
                  </div>
                  <div className="mt-2 h-3 w-40 rounded-full bg-gray-100" />
                </div>
                <div className="mt-8 space-y-3">
                  <div className="h-11 w-full rounded-full bg-gray-100" />
                  <div className="h-5 w-32 mx-auto rounded-full bg-gray-100" />
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm sm:text-base text-secondary">
                Your shopping bag is currently empty.
              </p>
              <Link
                to="/products"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-10 lg:flex-1 lg:min-h-0">
              {/* Cart Items */}
              <div className="lg:col-span-8 lg:min-h-0 lg:flex lg:flex-col">
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto scrollbar-hide">
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex py-6"
                      >
                        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-gray-50 sm:h-28 sm:w-24">
                          {item.imageUrl || item.image_url || item.productImageUrl ? (
                            <img
                              src={item.imageUrl || item.image_url || item.productImageUrl}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-tertiary">
                              <ImageOff className="h-8 w-8 opacity-30" />
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex flex-1 flex-col justify-between">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-brand text-base font-medium text-primary">
                                <Link to={`/products/${item.productId}`} className="hover:underline">
                                  {item.productName}
                                </Link>
                              </h3>
                              <p className="mt-1 text-xs text-secondary">
                                {[item.size, item.color].filter(Boolean).join(' | ')}
                              </p>
                            </div>
                            <p className="text-lg font-medium text-primary">
                              Nu {formatPrice(item.totalPrice)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-border px-3 py-1">
                              <button
                                onClick={() => handleUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                                disabled={updatingId === item.id || item.quantity <= 1}
                                className="p-1 text-secondary hover:text-primary disabled:opacity-30"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="mx-3 min-w-[1.5rem] text-center text-xs font-medium text-primary">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                disabled={
                                  updatingId === item.id ||
                                  (item.availableStock != null && item.quantity >= item.availableStock)
                                }
                                className="p-1 text-secondary hover:text-primary disabled:opacity-30"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveClick(item)}
                              className="text-[11px] font-medium text-secondary underline hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 flex justify-between border-t border-border pt-8 lg:mt-0 lg:shrink-0 lg:bg-white">
                  <button
                    onClick={() => setShowClearCartConfirm(true)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Clear Bag
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-10 rounded-xl bg-gray-50 p-6 lg:col-span-4 lg:mt-0 lg:self-start lg:sticky lg:top-24">
                <h2 className="font-brand text-lg font-medium text-primary">Order Summary</h2>
                
                <dl className="mt-6 space-y-3 text-sm text-secondary">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-medium text-primary">Nu {formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-4">
                    <dt className="text-base font-medium text-primary">Total</dt>
                    <dd className="text-xl font-bold text-primary">Nu {formatPrice(subtotal)}</dd>
                  </div>
                  <p className="mt-1 text-xs text-secondary/60">Shipping & taxes calculated at checkout</p>
                </dl>

                <div className="mt-8">
                  <Link
                    to="/checkout"
                    className="flex w-full items-center justify-center rounded-full border border-[var(--color-accent-blush)] bg-[var(--color-accent-blush)] py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-primary shadow-lg transition-all hover:bg-[#f4d7c5] hover:border-[#f4d7c5] hover:shadow-xl"
                  >
                    Checkout
                  </Link>
                  <Link
                    to="/products"
                    className="mt-4 flex w-full justify-center text-sm font-medium text-secondary hover:text-primary"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Remove Item Modal */}
      <AnimatePresence>
        {itemToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToRemove(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-primary">Remove Item?</h3>
              <p className="mt-2 text-sm text-secondary">
                Are you sure you want to remove <span className="font-medium text-primary">{itemToRemove.productName}</span> from your bag?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setItemToRemove(null)}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold uppercase tracking-wider text-primary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveConfirm}
                  className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Cart Modal */}
      <AnimatePresence>
        {showClearCartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearCartConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-primary">Clear Bag?</h3>
              <p className="mt-2 text-sm text-secondary">
                Are you sure you want to remove all items? This cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowClearCartConfirm(false)}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold uppercase tracking-wider text-primary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCartConfirm}
                  className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-700"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
