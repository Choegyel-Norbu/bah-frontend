import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { getAddresses } from '@/services/addressService';
import { createOrder } from '@/services/orderService';
import { Package, MapPin, Loader2, ImageOff, ArrowRight } from 'lucide-react';

function formatPrice(value) {
  if (typeof value !== 'number') return String(value ?? '');
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, totalItems, clearCart, fetchCart } = useCart();
  const { show: showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  const [shippingAddressId, setShippingAddressId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

// Ensure we start at top when showing confirmation view
useEffect(() => {
  if (placedOrder) {
    window.scrollTo(0, 0);
  }
}, [placedOrder]);

  useEffect(() => {
    if (totalItems === 0 && !placedOrder) {
      navigate('/cart', { replace: true });
      return;
    }
  }, [totalItems, placedOrder, navigate]);

  useEffect(() => {
    getAddresses()
      .then((list) => {
        setAddresses(Array.isArray(list) ? list : []);
        const shipping = (Array.isArray(list) ? list : []).filter(
          (a) => (a.addressType || a.type || '').toUpperCase() === 'SHIPPING'
        );
        const defaultAddr = shipping.find((a) => a.isDefault) ?? shipping[0];
        if (defaultAddr?.id) {
          setShippingAddressId(String(defaultAddr.id));
        } else if (list?.length > 0 && list[0]?.id) {
          setShippingAddressId(String(list[0].id));
        }
      })
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, []);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddressId?.trim()) {
      setError('Please select a shipping address.');
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const order = await createOrder({
        shippingAddressId: Number(shippingAddressId),
        couponCode: couponCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPlacedOrder(order);
      await clearCart();
      if (fetchCart) fetchCart();
      showToast({
        title: 'Order placed',
        message: `Order ${order.orderNumber} has been placed successfully.`,
        variant: 'success',
        position: 'bottom-right',
        duration: 5000,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Failed to place order. Your cart was not changed.';
      setError(msg);
    } finally {
      setPlacing(false);
    }
  };

  if (totalItems === 0 && !placedOrder) {
    return null;
  }

  if (placedOrder) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-border bg-white p-6 text-center sm:p-8 shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Package className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="mt-4 font-brand text-2xl text-primary">Thank you for your order</h1>
              <p className="mt-2 text-sm text-secondary">
                Order number:{' '}
                <strong className="text-primary">{placedOrder.orderNumber}</strong>
              </p>
              <p className="mt-1 text-xs text-secondary">
                Total: Nu {formatPrice(placedOrder.total)} /-
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to={`/account/orders?highlight=${encodeURIComponent(placedOrder.orderNumber)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-secondary"
                >
                  View order
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-gray-50"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2 text-secondary">
              <Package className="h-5 w-5" aria-hidden />
              <h1 className="font-brand text-3xl text-primary">Checkout</h1>
            </div>
            <p className="text-xs font-medium text-secondary">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>

          <form onSubmit={handlePlaceOrder} className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Shipping address */}
              <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
                    Shipping address
                  </h2>
                  <p className="mt-1 text-xs text-secondary/70">
                    Choose where you’d like this order delivered.
                  </p>
                </div>
                {loadingAddresses ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-gray-50 p-3 text-secondary">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    <span className="text-sm">Loading addresses…</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-gray-50 p-3 text-secondary">
                    <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <p className="text-sm">
                      No addresses found.{' '}
                      <Link to="/account/settings#addresses" className="font-medium text-primary hover:underline">
                        Add an address in Settings
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 rounded-xl border border-border bg-gray-50/60 p-3 sm:p-4">
                    {(addresses.filter(
                      (a) => (a.addressType || a.type || '').toUpperCase() === 'SHIPPING'
                    ).length > 0
                      ? addresses.filter(
                          (a) => (a.addressType || a.type || '').toUpperCase() === 'SHIPPING'
                        )
                      : addresses
                    ).map((addr) => (
                      <label
                        key={addr.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm text-secondary transition-colors shadow-[0_1px_0_rgba(15,23,42,0.03)] has-[:checked]:bg-primary/3 has-[:checked]:ring-2 has-[:checked]:ring-primary/25"
                      >
                        <input
                          type="radio"
                          name="shippingAddress"
                          value={addr.id}
                          checked={shippingAddressId === String(addr.id)}
                          onChange={() => setShippingAddressId(String(addr.id))}
                          className="mt-1.5 h-4 w-4 border-border text-primary focus:ring-primary"
                          aria-label={`Select ${addr.streetAddress}, ${addr.city}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">
                            {addr.streetAddress}
                            {addr.isDefault && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-secondary">
                            {[addr.city, addr.state, addr.postalCode, addr.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {/* Order notes */}
              <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
                    Order notes
                  </h2>
                  <p className="mt-1 text-xs text-secondary/70">Optional instructions for your delivery.</p>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    id="checkout-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Delivery instructions, gate code, preferred time, etc."
                    className="w-full border-b border-border bg-transparent px-0 py-2.5 text-sm text-primary placeholder-tertiary placeholder:text-xs focus:outline-none focus:border-primary"
                    aria-label="Order notes"
                  />
                </div>
              </section>

              {/* Coupon */}
              <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
                    Coupon
                  </h2>
                  <p className="mt-1 text-xs text-secondary/70">Have a promo code? Apply it to this order.</p>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="w-full border-b border-border bg-transparent px-0 py-2.5 text-sm text-primary placeholder-tertiary placeholder:text-xs focus:outline-none focus:border-primary sm:flex-1"
                    aria-label="Coupon code"
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-dashed border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary hover:border-primary hover:text-primary"
                  >
                    Apply
                  </button>
                </div>
              </section>
            </div>

            <div className="lg:col-span-5">
              <section className="sticky top-24 rounded-xl bg-gray-50 p-6">
                <h2 className="font-brand text-lg font-medium text-primary">Order Summary</h2>
                <div className="mt-4 max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-hide">
                  <ul className="space-y-4">
                    {items.map((item) => (
                      <li key={item.id} className="flex gap-4 border-b border-border/50 pb-4 last:border-0">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-gray-100 sm:h-18 sm:w-18">
                          {item.imageUrl || item.image_url || item.productImageUrl ? (
                            <img
                              src={item.imageUrl || item.image_url || item.productImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-tertiary">
                              <ImageOff className="h-6 w-6" aria-hidden />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary sm:text-base">
                            {item.productName}
                          </p>
                          <p className="mt-0.5 text-xs text-secondary sm:text-[13px]">
                            {item.size} / {item.color} × {item.quantity}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-primary sm:text-base">
                            Nu {formatPrice(item.totalPrice)} /-
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Subtotal</span>
                    <span className="font-medium text-primary">
                      Nu {formatPrice(subtotal)} /-
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-secondary">
                    Shipping and any discount will be applied when you place the order.
                  </p>
                </div>

                {error && (
                  <div
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    placing ||
                    loadingAddresses ||
                    addresses.length === 0 ||
                    !shippingAddressId?.trim()
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-accent-blush)] bg-[var(--color-accent-blush)] px-4 py-3 text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-primary transition-colors hover:bg-[#f4d7c5] hover:border-[#f4d7c5] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {placing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Placing order…
                    </>
                  ) : (
                    <>
                      Place order — Nu {formatPrice(subtotal)} /-
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </>
                  )}
                </button>

                <Link
                  to="/cart"
                  className="mt-3 block text-center text-xs font-medium text-secondary hover:text-primary"
                >
                  ← Back to cart
                </Link>
              </section>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
