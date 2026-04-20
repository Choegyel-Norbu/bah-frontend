import { useState, useEffect, useCallback } from 'react';
import { getOrders } from '@/services/orderService';
import { updateOrderStatus } from '@/services/adminOrderService';
import { Link } from 'react-router-dom';
import { Package, Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

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
    return d.toLocaleDateString('en-US', {
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
  const styles =
    statusLower === 'cancelled' || statusLower === 'returned'
      ? 'bg-red-50 text-red-700 border-red-100'
      : statusLower === 'delivered'
        ? 'bg-green-50 text-green-700 border-green-100'
        : statusLower === 'shipped' || statusLower === 'processing'
          ? 'bg-blue-50 text-blue-700 border-blue-100'
          : statusLower === 'confirmed'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-gray-50 text-gray-700 border-gray-100';
            
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${styles}`}
    >
      {status || 'Unknown'}
    </span>
  );
}

export default function OrdersPage() {
  const { show: showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [returnConfirmOrderNumber, setReturnConfirmOrderNumber] = useState(null);
  const [returningOrderNumber, setReturningOrderNumber] = useState(null);
  const [deliverConfirmOrderNumber, setDeliverConfirmOrderNumber] = useState(null);
  const [deliveringOrderNumber, setDeliveringOrderNumber] = useState(null);

  // Always start from the top and first page when the orders page is loaded/entered
  useEffect(() => {
    window.scrollTo(0, 0);
    setPage(0);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrders({
        page,
        size: PAGE_SIZE,
        status: statusFilter.trim() || undefined,
      });
      setOrders(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      setLast(result.last);
    } catch (err) {
      setError(err?.message ?? 'Failed to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const canReturnOrder = useCallback((order) => {
    const status = (order?.status ?? '').toString().trim().toUpperCase();
    return status === 'DELIVERED';
  }, []);

  const canMarkDelivered = useCallback((order) => {
    const status = (order?.status ?? '').toString().trim().toUpperCase();
    return status === 'SHIPPED';
  }, []);

  const handleReturnOrder = useCallback(async () => {
    if (!returnConfirmOrderNumber) return;
    setReturningOrderNumber(returnConfirmOrderNumber);
    setError(null);
    try {
      await updateOrderStatus(returnConfirmOrderNumber, 'RETURNED');
      setReturnConfirmOrderNumber(null);
      showToast({ message: 'Return request submitted successfully.', variant: 'success' });
      await fetchOrders();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to return order.';
      showToast({ message: msg, variant: 'error' });
    } finally {
      setReturningOrderNumber(null);
    }
  }, [returnConfirmOrderNumber, fetchOrders, showToast]);

  const handleMarkDelivered = useCallback(async (orderNumber) => {
    const toConfirm = orderNumber ?? deliverConfirmOrderNumber;
    if (!toConfirm) return;
    setDeliveringOrderNumber(toConfirm);
    setError(null);
    try {
      await updateOrderStatus(toConfirm, 'DELIVERED');
      setDeliverConfirmOrderNumber(null);
      showToast({ message: 'Delivery confirmed.', variant: 'success' });
      await fetchOrders();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to mark delivered.';
      showToast({ message: msg, variant: 'error' });
    } finally {
      setDeliveringOrderNumber(null);
    }
  }, [deliverConfirmOrderNumber, fetchOrders, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const from = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-xl text-primary">Order History</h1>
          <p className="mt-1 text-sm text-secondary/70">
            Track and manage your recent purchases.
          </p>
        </div>
        
        <div className="relative min-w-[180px]">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full cursor-pointer appearance-none rounded-full border border-border bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-white"
            >
              {/* Card header skeleton */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gray-50/50 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <div className="space-y-1">
                    <div className="h-2.5 w-20 rounded-full bg-gray-100" />
                    <div className="h-3 w-28 rounded-full bg-gray-100" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2.5 w-14 rounded-full bg-gray-100" />
                    <div className="h-3 w-16 rounded-full bg-gray-100" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 rounded-full bg-gray-100" />
                    <div className="h-3 w-24 rounded-full bg-gray-100" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-gray-100" />
              </div>

              {/* Card body skeleton */}
              <div className="p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {[0, 1, 2].map((img) => (
                      <div
                        key={img}
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-gray-100"
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="h-3 w-32 rounded-full bg-gray-100" />
                    <div className="h-8 w-28 rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-gray-50/50 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <Package className="h-6 w-6 text-tertiary" />
          </div>
          <h3 className="mt-3 text-base font-medium text-primary">No orders found</h3>
          <p className="mt-1.5 max-w-sm text-xs text-secondary/70">
            {statusFilter 
              ? "We couldn't find any orders matching your selected filter."
              : "You haven't placed any orders yet. Start shopping to fill your wardrobe."}
          </p>
          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-secondary transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id ?? order.orderNumber}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="group overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-md"
            >
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gray-50/50 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary/70">Order Placed</span>
                    <span className="text-sm font-medium text-primary">{formatDate(order.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary/70">Total</span>
                    <span className="text-sm font-medium text-primary">Nu {formatPrice(order.total)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary/70">Order #</span>
                    <span className="text-sm font-mono font-medium text-primary">{order.orderNumber ?? order.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <Link
                    to={`/account/orders/${encodeURIComponent(order.orderNumber ?? order.id)}`}
                    className="hidden text-sm font-medium text-primary underline underline-offset-4 hover:text-secondary sm:block"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              {/* Order Content */}
              <div className="p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Items Preview */}
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 border border-border">
                        {item.imageUrl || item.image_url ? (
                          <img 
                            src={item.imageUrl || item.image_url} 
                            alt="" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-tertiary">
                            <Package className="h-4 w-4 opacity-30" />
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 rounded-tl bg-white/90 px-1 py-0.5 text-[10px] font-bold text-primary backdrop-blur-sm sm:text-xs">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                    {(order.items?.length ?? 0) > 3 && (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-gray-50 text-sm font-medium text-secondary">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {canMarkDelivered(order) && (
                      <button
                        onClick={() => setDeliverConfirmOrderNumber(order.orderNumber ?? String(order.id))}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-green-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Delivery
                      </button>
                    )}
                    
                    {canReturnOrder(order) && (
                      <button
                        onClick={() => setReturnConfirmOrderNumber(order.orderNumber ?? String(order.id))}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-red-600 transition-colors hover:border-red-100 hover:bg-red-50"
                      >
                        Return Order
                      </button>
                    )}

                    <Link
                      to={`/account/orders/${encodeURIComponent(order.orderNumber ?? order.id)}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-gray-50 sm:hidden"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-secondary">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={last}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dialogs */}
      <AnimatePresence>
        {/* Return Dialog */}
        {returnConfirmOrderNumber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReturnConfirmOrderNumber(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-5 shadow-2xl"
            >
              <h2 className="text-lg font-brand text-primary">Return Order?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-secondary/80">
                Do you want to request a return for order <span className="font-mono font-medium text-primary">#{returnConfirmOrderNumber}</span>?
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setReturnConfirmOrderNumber(null)}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary hover:bg-gray-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleReturnOrder}
                  disabled={returningOrderNumber != null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-700"
                >
                  {returningOrderNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Yes, Return
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delivery Dialog */}
        {deliverConfirmOrderNumber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeliverConfirmOrderNumber(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-5 shadow-2xl"
            >
              <h2 className="text-lg font-brand text-primary">Confirm Delivery</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-secondary/80">
                Please confirm that you have received order <span className="font-mono font-medium text-primary">#{deliverConfirmOrderNumber}</span>.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDeliverConfirmOrderNumber(null)}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary hover:bg-gray-50"
                >
                  Not Yet
                </button>
                <button
                  onClick={() => handleMarkDelivered()}
                  disabled={deliveringOrderNumber != null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-green-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-green-700"
                >
                  {deliveringOrderNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Received
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
