import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  Package,
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  getAdminOrders,
  updateOrderStatus,
  cancelAdminOrder,
  getErrorMessage,
} from '@/services/adminOrderService';

const PAGE_SIZE = 20;
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

/** Statuses that can be set in the "Update status" dropdown in view details (includes Shipped and Delivered). */
const UPDATE_STATUS_OPTIONS = [
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getCustomerLabel(order) {
  if (order.customer) {
    const { firstName, lastName, email } = order.customer;
    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }
    return email;
  }
  return order.customerEmail || `User #${order.userId || '?'}`;
}

function getCustomerInitials(order) {
  const label = getCustomerLabel(order);
  return (label?.[0] || 'U').toUpperCase();
}

function StatusBadge({ status }) {
  const statusLower = (status || '').toLowerCase();
  
  let styles = 'bg-gray-50 text-gray-700 border-gray-100';
  let icon = null;

  if (statusLower === 'cancelled' || statusLower === 'returned') {
    styles = 'bg-red-50 text-red-700 border-red-100';
    icon = <XCircle className="h-3 w-3 mr-1" />;
  } else if (statusLower === 'delivered') {
    styles = 'bg-green-50 text-green-700 border-green-100';
    icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
  } else if (statusLower === 'shipped') {
    styles = 'bg-blue-50 text-blue-700 border-blue-100';
    icon = <Truck className="h-3 w-3 mr-1" />;
  } else if (statusLower === 'confirmed' || statusLower === 'processing') {
    styles = 'bg-amber-50 text-amber-700 border-amber-100';
    icon = <Package className="h-3 w-3 mr-1" />;
  } else if (statusLower === 'pending') {
    styles = 'bg-gray-50 text-gray-700 border-gray-100';
    icon = <Clock className="h-3 w-3 mr-1" />;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles}`}
    >
      {icon}
      {status || 'Unknown'}
    </span>
  );
}

function OrderDetailRow({
  order,
  formatPrice,
  formatDate,
  StatusBadge,
  detailError,
  statusUpdating,
  newStatus,
  setNewStatus,
  cancelConfirm,
  setCancelConfirm,
  canChangeStatus,
  updateStatusOptions,
  onUpdateStatus,
  onCancelOrder,
  onClose,
}) {
  const detailsPanelRef = useRef(null);
  const hasRevealHandledRef = useRef(false);

  /** Run once when the open animation finishes: bring panel into view, then focus without changing scroll. */
  const showAndFocusDetailsPanel = useCallback(() => {
    const el = detailsPanelRef.current;
    if (!el || hasRevealHandledRef.current) return;
    hasRevealHandledRef.current = true;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      ref={detailsPanelRef}
      role="region"
      aria-label="Order details"
      tabIndex={-1}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      onAnimationComplete={showAndFocusDetailsPanel}
      className="scroll-mt-4 bg-gray-50/50 border-t border-border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-brand text-primary">Order Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-secondary hover:text-primary transition-colors"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer & Order Info */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-white p-5">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Information</h4>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <p className="text-xs text-secondary/70">Order Number</p>
                  <p className="font-mono font-medium text-primary mt-0.5">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary/70">Date Placed</p>
                  <p className="font-medium text-primary mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary/70">Customer</p>
                  <p className="font-medium text-primary mt-0.5">
                    {getCustomerLabel(order)}
                  </p>
                  {order.customer?.email && (
                    <p className="text-xs text-secondary">{order.customer.email}</p>
                  )}
                  {order.customer?.phoneNumber && (
                    <p className="text-xs text-secondary">{order.customer.phoneNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-secondary/70">Payment</p>
                  <p className="font-medium text-primary mt-0.5">
                    {order.paymentMethod || '—'} 
                    <span className="text-secondary/50 mx-1">•</span> 
                    {order.paymentStatus || '—'}
                  </p>
                </div>
              </div>
              {order.shippingAddress && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs text-secondary/70">Shipping Address</p>
                  <p className="font-medium text-primary mt-0.5">
                    {order.shippingAddress.streetAddress}
                  </p>
                  <p className="text-sm text-secondary">
                    {[
                      order.shippingAddress.city,
                      order.shippingAddress.state,
                      order.shippingAddress.postalCode,
                      order.shippingAddress.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
              {order.notes && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs text-secondary/70">Notes</p>
                  <p className="text-primary mt-0.5 italic">{order.notes}</p>
                </div>
              )}
            </div>

            {canChangeStatus && (
              <div className="rounded-xl border border-border bg-white p-5">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Actions</h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Update Status</label>
                    <div className="flex gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {updateStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={onUpdateStatus}
                        disabled={statusUpdating || newStatus === order.status || !newStatus}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  </div>

                  {!['CANCELLED', 'RETURNED'].includes((order.status || '').toUpperCase()) && (
                    <div className="border-t border-gray-100 pt-4">
                      {!cancelConfirm ? (
                        <button
                          type="button"
                          onClick={() => setCancelConfirm(order.orderNumber)}
                          disabled={statusUpdating}
                          className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      ) : (
                        <div className="rounded-lg bg-red-50 p-3 border border-red-100">
                          <p className="text-xs font-medium text-red-800 mb-2 text-center">Are you sure? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCancelConfirm(null)}
                              className="flex-1 rounded-md bg-white border border-red-200 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              No, Keep
                            </button>
                            <button
                              type="button"
                              onClick={onCancelOrder}
                              disabled={statusUpdating}
                              className="flex-1 rounded-md bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                            >
                              Yes, Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-border">
              <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Order Items</h4>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 pl-5 pr-2 text-left font-medium text-secondary text-xs uppercase tracking-wider">Item</th>
                    <th className="py-3 px-2 text-center font-medium text-secondary text-xs uppercase tracking-wider">Qty</th>
                    <th className="py-3 pl-2 pr-5 text-right font-medium text-secondary text-xs uppercase tracking-wider">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(order.items || []).map((item) => (
                    <tr key={item.id ?? `${item.sku}-${item.quantity}`} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pl-5 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100 border border-gray-200 overflow-hidden">
                            {/* Placeholder for item image if available */}
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <Package className="h-5 w-5" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-primary">{item.productName || 'Unknown Product'}</p>
                            <p className="text-xs text-secondary">
                              {item.size && <span className="mr-2">Size: {item.size}</span>}
                              {item.color && <span>Color: {item.color}</span>}
                            </p>
                            <p className="text-xs font-mono text-secondary/50 mt-0.5">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-primary font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-3 pl-2 pr-5 text-right text-primary font-medium">
                        Nu {formatPrice(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-gray-50/50 p-5 space-y-2">
              <div className="flex justify-between text-sm text-secondary">
                <span>Subtotal</span>
                <span>Nu {formatPrice(order.subtotal)}</span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- Nu {formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-secondary">
                <span>Shipping & Tax</span>
                <span>Nu {formatPrice((order.shippingCost ?? 0) + (order.tax ?? 0))}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-baseline">
                <span className="font-bold text-primary">Total</span>
                <span className="text-lg font-bold text-primary">Nu {formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {detailError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {detailError}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);

  const detailOrder =
    expandedOrderNumber != null
      ? orders.find((o) => (o.orderNumber ?? String(o.id)) === expandedOrderNumber) ?? null
      : null;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminOrders({
        page,
        size: PAGE_SIZE,
        status: statusFilter.trim() || undefined,
      });
      setOrders(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      setLast(result.last);
    } catch (err) {
      setError(getErrorMessage(err));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const allRows = [];
      let exportPage = 0;
      let lastPage = false;

      while (!lastPage) {
        // Reuse the admin orders API to page through all data with current status filter
        const result = await getAdminOrders({
          page: exportPage,
          size: PAGE_SIZE,
          status: statusFilter.trim() || undefined,
        });
        const batch = Array.isArray(result.content) ? result.content : [];
        batch.forEach((o) => {
          const created = o.createdAt ?? o.created_at;
          const dateStr = created ? new Date(created).toISOString() : '';
          const customerName =
            o.customer?.firstName || o.customer?.lastName
              ? `${o.customer?.firstName ?? ''} ${o.customer?.lastName ?? ''}`.trim()
              : o.customerEmail ?? o.customer?.email ?? '';
          const shippingCity = o.shippingAddress?.city ?? '';
          const shippingCountry = o.shippingAddress?.country ?? '';
          const itemCount = Array.isArray(o.items) ? o.items.length : 0;

          allRows.push({
            orderNumber: o.orderNumber ?? o.id,
            date: dateStr,
            status: o.status ?? '',
            total: o.total ?? 0,
            subtotal: o.subtotal ?? 0,
            discount: o.discount ?? 0,
            tax: o.tax ?? 0,
            shippingCost: o.shippingCost ?? 0,
            paymentMethod: o.paymentMethod ?? '',
            paymentStatus: o.paymentStatus ?? '',
            customerName,
            customerEmail: o.customerEmail ?? o.customer?.email ?? '',
            shippingCity,
            shippingCountry,
            itemCount,
          });
        });

        lastPage = result.last ?? true;
        exportPage += 1;
      }

      if (!allRows.length) {
        return;
      }

      const worksheetData = allRows.map((row) => ({
        'Order Number': row.orderNumber,
        'Date (ISO)': row.date,
        Status: row.status,
        Total: row.total,
        Subtotal: row.subtotal,
        Discount: row.discount,
        Tax: row.tax,
        'Shipping Cost': row.shippingCost,
        'Payment Method': row.paymentMethod,
        'Payment Status': row.paymentStatus,
        'Customer Name': row.customerName,
        'Customer Email': row.customerEmail,
        'Shipping City': row.shippingCity,
        'Shipping Country': row.shippingCountry,
        'Item Count': row.itemCount,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
      const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
    } finally {
      setExporting(false);
    }
  }, [statusFilter]);

  const toggleExpand = (order) => {
    const key = order.orderNumber ?? String(order.id);
    setDetailError(null);
    setCancelConfirm(null);
    if (expandedOrderNumber === key) {
      setExpandedOrderNumber(null);
    } else {
      setExpandedOrderNumber(key);
      const status = (order.status || '').toUpperCase();
      setNewStatus(UPDATE_STATUS_OPTIONS.some((o) => o.value === status) ? status : (order.status || ''));
    }
  };

  const closeDetail = () => {
    setExpandedOrderNumber(null);
    setDetailError(null);
    setCancelConfirm(null);
  };

  const handleUpdateStatus = async () => {
    if (!detailOrder || !newStatus || newStatus === detailOrder.status) return;
    setStatusUpdating(true);
    setDetailError(null);
    try {
      await updateOrderStatus(detailOrder.orderNumber, newStatus);
      setCancelConfirm(null);
      await fetchOrders();
      setNewStatus(newStatus);
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelConfirm || cancelConfirm !== detailOrder?.orderNumber) return;
    setStatusUpdating(true);
    setDetailError(null);
    try {
      await cancelAdminOrder(detailOrder.orderNumber);
      setCancelConfirm(null);
      await fetchOrders();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  const from = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Orders</h1>
          <p className="mt-1 text-sm text-secondary/70">
            Manage customer orders and status updates.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full appearance-none rounded-full border border-border bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-shadow hover:shadow-md"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportAll}
            disabled={exporting || loading}
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                Export Orders (Excel)
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-4 pl-6 pr-4 font-semibold text-secondary text-xs uppercase tracking-wider">Order</th>
                  <th className="py-4 px-4 font-semibold text-secondary text-xs uppercase tracking-wider">Date</th>
                  <th className="py-4 px-4 font-semibold text-secondary text-xs uppercase tracking-wider">Customer</th>
                  <th className="py-4 px-4 font-semibold text-secondary text-xs uppercase tracking-wider">Status</th>
                  <th className="py-4 px-4 font-semibold text-secondary text-xs uppercase tracking-wider text-right">Total</th>
                  <th className="py-4 pl-4 pr-6 font-semibold text-secondary text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-secondary">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="font-medium text-primary">No orders found</p>
                        <p className="text-sm text-secondary/70 mt-1">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const key = order.orderNumber ?? String(order.id);
                    const isExpanded = expandedOrderNumber === key;
                    return (
                      <Fragment key={order.id ?? order.orderNumber}>
                        <tr className={`group transition-colors ${isExpanded ? 'bg-gray-50/80' : 'hover:bg-gray-50/50'}`}>
                          <td className="py-4 pl-6 pr-4">
                            <span className="font-mono font-medium text-primary">{order.orderNumber ?? `#${order.id}`}</span>
                          </td>
                          <td className="py-4 px-4 text-secondary">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {getCustomerInitials(order)}
                              </div>
                              <span className="text-primary truncate max-w-[150px]" title={getCustomerLabel(order)}>
                                {getCustomerLabel(order)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-primary">
                            Nu {formatPrice(order.total)}
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <button
                              onClick={() => toggleExpand(order)}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-gray-200 transition-colors"
                            >
                              {isExpanded ? 'Close' : 'Manage'}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0 border-b border-border">
                                <OrderDetailRow
                                  order={order}
                                  formatPrice={formatPrice}
                                  formatDate={formatDate}
                                  StatusBadge={StatusBadge}
                                  detailError={detailError}
                                  statusUpdating={statusUpdating}
                                  newStatus={newStatus}
                                  setNewStatus={setNewStatus}
                                  cancelConfirm={cancelConfirm}
                                  setCancelConfirm={setCancelConfirm}
                                  canChangeStatus={
                                    !['CANCELLED', 'RETURNED'].includes(
                                      (order.status || '').toUpperCase()
                                    )
                                  }
                                  updateStatusOptions={UPDATE_STATUS_OPTIONS}
                                  onUpdateStatus={handleUpdateStatus}
                                  onCancelOrder={handleCancelOrder}
                                  onClose={closeDetail}
                                />
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-gray-50/50 px-6 py-4">
              <p className="text-xs text-secondary">
                Showing <span className="font-medium text-primary">{from}</span> to <span className="font-medium text-primary">{to}</span> of <span className="font-medium text-primary">{totalElements}</span> results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={last}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
