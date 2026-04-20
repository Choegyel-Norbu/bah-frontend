import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNotifications,
  getAdminNotifications,
  markNotificationRead,
  markAdminNotificationRead,
  markAllNotificationsRead,
  markAllAdminNotificationsRead,
  filterNotificationsForAdmin,
  filterNotificationsForCustomer,
} from '@/services/notificationService';
import { Bell, Loader2, Check, CheckCheck, Inbox, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 50;

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Resolves the URL for a notification based on referenceType and referenceId.
 * For ORDER: referenceId is the order number (e.g. ORD-20260313-0001); links to order detail.
 * Used for order status updates (shipped, delivered) and other order-related notifications.
 * @param {string} referenceType - e.g. "ORDER"
 * @param {string} referenceId - e.g. order number "ORD-20260313-0001"
 * @returns {string | null} - Route to order detail or null
 */
function getNotificationLink(referenceType, referenceId) {
  if (!referenceType || !referenceId) return null;
  if (referenceType === 'ORDER') {
    return `/account/orders/${encodeURIComponent(referenceId)}`;
  }
  return null;
}

function isAdmin(user) {
  return user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const { user } = useAuth();
  const isAdminUser = isAdmin(user);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let content = [];
      if (isAdminUser) {
        const result = await getAdminNotifications({
          read: false,
          page: 0,
          size: PAGE_SIZE,
        });
        content = filterNotificationsForAdmin(result.content ?? []);
      } else {
        const result = await getNotifications({ read: false, size: PAGE_SIZE });
        content = filterNotificationsForCustomer(result.content ?? []);
      }
      content.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setNotifications(content);
    } catch (err) {
      setError(err?.message ?? 'Failed to load notifications.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Scroll to top every time the page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const markRead = isAdminUser ? markAdminNotificationRead : markNotificationRead;

  const handleMarkRead = async (e, notification) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (notification.read) return;
    setMarkingId(notification.id);
    try {
      await markRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      setError(err?.message ?? 'Failed to mark as read.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleNotificationClick = async (e, notification, link) => {
    if (!notification.read) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setMarkingId(notification.id);
      try {
        await markRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        setError(err?.message ?? 'Failed to mark as read.');
        setMarkingId(null);
        return;
      }
      setMarkingId(null);
      if (link) navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    setError(null);
    try {
      if (isAdminUser) {
        try {
          await markAllAdminNotificationsRead();
        } catch {
          await Promise.all(unread.map((n) => markAdminNotificationRead(n.id)));
        }
      } else {
        await markAllNotificationsRead();
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      setError(err?.message ?? 'Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div>
        <h1 className="font-brand text-xl text-primary">Notifications</h1>
        <p className="mt-0.5 text-xs text-secondary/70">
          Order updates and promotions. Tap a notification to open the related order.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-medium text-primary">All Notifications</h2>
              {hasUnread && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary disabled:opacity-50"
                  aria-label="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Mark All Read
                </button>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    role="alert"
                    className="rounded-md border border-red-100 bg-red-50 p-3 text-xs text-red-600"
                  >
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary/30" aria-hidden />
                <span className="sr-only">Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-gray-50/50 p-8 text-center">
                <Inbox className="mx-auto h-10 w-10 text-tertiary/50" aria-hidden />
                <p className="mt-3 text-sm font-medium text-primary">No notifications</p>
                <p className="mt-1 text-xs text-secondary/80">
                  When you get order updates or promos, they will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-4" aria-label="Notification list">
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification, index) => {
                    const link = isAdminUser
                      ? '/admin/orders'
                      : getNotificationLink(
                          notification.referenceType,
                          notification.referenceId
                        );
                    const isUnread = !notification.read;
                    const cardClassName = `relative rounded-xl border p-5 transition-all ${
                      isUnread
                        ? 'border-primary bg-primary/5 hover:border-primary/80'
                        : 'border-border bg-white hover:border-primary/30'
                    }`;

                    const isOrderStatusUpdate =
                      notification.type === 'ORDER_STATUS_UPDATE' ||
                      notification.referenceType === 'ORDER';
                    const isShipped =
                      notification.title === 'Order shipped' || notification.title?.toLowerCase().includes('shipped');
                    const isDelivered =
                      notification.title === 'Order delivered' || notification.title?.toLowerCase().includes('delivered');

                    const content = (
                      <>
                        <div className="min-w-0 flex-1 pr-10">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-sm ${
                                isUnread
                                  ? 'font-semibold text-primary'
                                  : 'font-medium text-primary'
                              }`}
                            >
                              {notification.title}
                            </p>
                            {isOrderStatusUpdate && (isShipped || isDelivered) && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  isDelivered
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                <Package className="h-3 w-3" aria-hidden />
                                {isDelivered ? 'Delivered' : 'Shipped'}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-secondary/90 leading-snug">
                            {notification.message}
                          </p>
                          {isAdminUser && (notification.userEmail || notification.userId) && (
                            <p className="mt-1 text-xs text-tertiary">
                              To: {notification.userEmail ?? `User #${notification.userId}`}
                            </p>
                          )}
                          <p className="mt-2 text-xs uppercase tracking-wider text-tertiary">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkRead(e, notification)}
                            disabled={markingId === notification.id}
                            className="absolute right-4 top-5 rounded-full p-2 text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                            aria-label={`Mark "${notification.title}" as read`}
                          >
                            {markingId === notification.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Check className="h-4 w-4" aria-hidden />
                            )}
                          </button>
                        )}
                      </>
                    );

                    return (
                      <motion.li
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut', delay: index * 0.02 }}
                      >
                        {link ? (
                          <Link
                            to={link}
                            className={`block ${cardClassName}`}
                            onClick={(e) => handleNotificationClick(e, notification, link)}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            className={`block cursor-pointer ${cardClassName}`}
                            onClick={(e) => handleNotificationClick(e, notification, null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleNotificationClick(e, notification, null);
                              }
                            }}
                          >
                            {content}
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-gray-50/50 p-6">
            <h3 className="font-brand text-lg text-primary">About Notifications</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary/80">
              You’ll receive notifications for new orders, shipping updates, and occasional promotions. Tap a notification to open the related order.
            </p>
            {hasUnread && (
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-primary">
                {notifications.filter((n) => !n.read).length} unread
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
