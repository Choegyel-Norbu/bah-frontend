import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, User, LogOut, X, ShoppingBag, Bell, LayoutDashboard, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { CartContext } from '@/context/CartContext';
import {
  getNotifications,
  getAdminNotifications,
  filterNotificationsForAdmin,
  filterNotificationsForCustomer,
} from '@/services/notificationService';
import { getProductSuggestions } from '@/services/productService';

const NAV_LINKS = [
  { to: '/products', label: 'Collection' },
  { to: '/products?newArrivalsOnly=true', label: 'New Arrivals' },
  { to: '/sale', label: 'Sale' },
];

function isAdmin(user) {
  return user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestDebounceRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const { isAuthenticated, user, logout } = useAuth();
  const showDashboard = isAuthenticated && isAdmin(user);
  const cart = useContext(CartContext);
  const totalItems = cart?.totalItems ?? 0;
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  // Scroll effect: background when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Home page only: hide navbar on scroll down, show on scroll up
  useEffect(() => {
    if (!isHomePage) {
      setNavbarVisible(true);
      return;
    }
    const SCROLL_THRESHOLD = 60;
    const handleScrollDirection = () => {
      const current = window.scrollY;
      if (current <= 20) {
        setNavbarVisible(true);
      } else if (current > lastScrollY.current && current > SCROLL_THRESHOLD) {
        setNavbarVisible(false);
      } else if (current < lastScrollY.current) {
        setNavbarVisible(true);
      }
      lastScrollY.current = current;
      ticking.current = false;
    };
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(handleScrollDirection);
        ticking.current = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHomePage]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    const admin = isAdmin(user);
    try {
      let content = [];
      if (admin) {
        const result = await getAdminNotifications({
          read: false,
          page: 0,
          size: 50,
        });
        content = filterNotificationsForAdmin(result.content ?? []);
      } else {
        const result = await getNotifications({ read: false, size: 50 });
        content = filterNotificationsForCustomer(result.content ?? []);
      }
      setUnreadCount(content.length);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    const onFocus = () => fetchUnreadCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const onUpdated = () => fetchUnreadCount();
    window.addEventListener('notifications-updated', onUpdated);
    return () => window.removeEventListener('notifications-updated', onUpdated);
  }, [fetchUnreadCount]);

  // Allow other components (e.g. profile page) to request logout confirmation
  useEffect(() => {
    const handler = () => setShowLogoutConfirm(true);
    window.addEventListener('request-logout', handler);
    return () => window.removeEventListener('request-logout', handler);
  }, []);

  const handleLogoutClick = () => setShowLogoutConfirm(true);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setMobileOpen(false);
    logout();
  };

  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      setSuggestions([]);
    }
  };

  // Debounced product suggestions (name, slug, first variant image as thumbnail)
  useEffect(() => {
    if (!searchOpen) {
      setSuggestions([]);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => {
      setSuggestionsLoading(true);
      getProductSuggestions({ q, limit: 5 })
        .then((list) => setSuggestions(Array.isArray(list) ? list : []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
      suggestDebounceRef.current = null;
    }, 300);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [searchOpen, searchQuery]);

  const handleSuggestionClick = (slug) => {
    if (slug) navigate(`/products/${encodeURIComponent(slug)}`);
    setSearchQuery('');
    setSuggestions([]);
    setSearchOpen(false);
  };

  const headerHidden = isHomePage && !navbarVisible;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: headerHidden ? '-100%' : 0 }}
        transition={
          headerHidden
            ? { type: 'tween', duration: 0.25, ease: 'easeIn' }
            : { type: 'spring', stiffness: 400, damping: 32 }
        }
        className={`fixed left-0 right-0 top-0 z-50 w-full transition-[background-color,box-shadow] duration-300 ease-out ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
        }`}
      >
        {/* Promo Bar */}
        <div className="bg-primary px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white sm:px-4 sm:py-2 sm:text-xs">
          New Season • Fresh Styles • Limited-Time Offers
        </div>

        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-20 sm:px-6 lg:px-8">
          {/* Mobile Menu Button - min touch target 44px */}
          <button
            type="button"
            className="flex min-h-11 min-w-11 -ml-1 items-center justify-center text-primary lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>

          {/* Desktop Nav (Left) */}
          <nav className="hidden items-center gap-10 lg:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-secondary/80 transition-colors hover:text-primary relative after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-primary after:transition-[width] after:duration-300 hover:after:w-full"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Logo (Center) */}
          <Link
            to="/"
            className="font-display absolute left-1/2 -translate-x-1/2 text-2xl font-normal tracking-normal text-primary sm:text-3xl lg:static lg:transform-none lg:text-[2.2rem]"
            aria-label="AttireHub Home"
          >
            AttireHub
          </Link>

          {/* Actions (Right) - touch targets on mobile */}
          <div className="flex items-center gap-0 sm:gap-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex min-h-11 min-w-11 items-center justify-center text-primary transition-colors hover:text-secondary sm:p-2"
              aria-label={searchOpen ? 'Close search' : 'Search'}
            >
              {searchOpen ? (
                <X className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Search className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>

            {isAuthenticated ? (
              <div className="hidden items-center gap-4 sm:flex">
                {showDashboard && (
                  <Link
                    to="/admin"
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to="/account/notifications"
                  className="relative p-2 text-primary transition-colors hover:text-secondary"
                >
                  <Bell className="h-5 w-5" strokeWidth={1.5} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </Link>
                <Link
                  to="/profile"
                  className="p-2 text-primary transition-colors hover:text-secondary"
                >
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-secondary/80 transition-colors hover:text-primary relative after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-primary after:transition-[width] after:duration-300 hover:after:w-full sm:block"
              >
                Sign In
              </Link>
            )}

            {!showDashboard && (
              <Link
                to="/cart"
                className="relative flex min-h-11 min-w-11 items-center justify-center text-primary transition-colors hover:text-secondary sm:p-2"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                {totalItems > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white sm:-right-1 sm:-top-1">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Search Overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border bg-white overflow-hidden"
            >
              <div className="mx-auto max-w-7xl px-4 py-8">
                <form onSubmit={handleSearch} className="relative mx-auto max-w-2xl">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for products..."
                    className="w-full border-b border-primary/20 bg-transparent py-4 pr-24 text-center text-xl text-primary placeholder:text-tertiary focus:border-primary focus:outline-none"
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    aria-expanded={suggestions.length > 0 || suggestionsLoading}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-24 top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-secondary hover:text-primary"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold uppercase tracking-wider text-primary"
                  >
                    Search
                  </button>
                </form>
                {/* Product suggestions: name, slug, first variant image as thumbnail */}
                <AnimatePresence>
                  {(suggestionsLoading || suggestions.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      id="search-suggestions"
                      role="listbox"
                      className="mx-auto mt-4 max-w-2xl rounded-md border border-border bg-white shadow-sm"
                      aria-label="Product suggestions"
                    >
                      {suggestionsLoading && (
                        <div className="divide-y divide-border px-4 py-3" aria-hidden="true">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-2/3 rounded-full bg-gray-100" />
                                <div className="h-3 w-1/3 rounded-full bg-gray-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!suggestionsLoading && suggestions.length > 0 && (
                        <ul className="divide-y divide-border">
                          {suggestions.map((item, index) => (
                            <motion.li
                              key={item.id ?? item.slug}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 3 }}
                              transition={{ duration: 0.18, delay: 0.03 * index, ease: 'easeOut' }}
                            >
                              <button
                                type="button"
                                role="option"
                                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                onClick={() => handleSuggestionClick(item.slug)}
                              >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-[#F0F0F0]">
                                  {item.thumbnail ? (
                                    <img
                                      src={item.thumbnail}
                                      alt=""
                                      className="h-full w-full object-cover object-center"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-tertiary">
                                      <ImageOff className="h-5 w-5 opacity-40" strokeWidth={1.5} />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate font-medium text-primary">{item.name}</span>
                                  <span className="block truncate text-xs text-secondary">{item.slug}</span>
                                </div>
                              </button>
                            </motion.li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer so content is not hidden under fixed header (promo bar + nav height) */}
      <div className="h-24 shrink-0 sm:h-28" aria-hidden />

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-[min(100vw,22rem)] flex flex-col bg-white shadow-2xl lg:hidden pl-[env(safe-area-inset-left)]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:p-6">
                <span className="font-brand text-xl tracking-tight text-primary sm:text-2xl">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 min-w-11 items-center justify-center text-primary hover:bg-gray-50 rounded-full transition-colors -mr-2"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
                <nav className="flex flex-col gap-8">
                  {/* Main Links */}
                  <div className="flex flex-col gap-6">
                    {NAV_LINKS.map(({ to, label }, i) => (
                      <motion.div
                        key={to}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                      >
                        <Link
                          to={to}
                          className="block py-2 text-3xl font-brand font-light text-secondary hover:text-primary transition-colors sm:text-3xl"
                          onClick={() => setMobileOpen(false)}
                        >
                          {label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <div className="h-px w-full bg-gray-100 my-2" />

                  {/* Account Links */}
                  <div className="flex flex-col gap-1">
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/profile"
                          className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-secondary hover:bg-gray-50 hover:text-primary sm:text-base"
                          onClick={() => setMobileOpen(false)}
                        >
                          <User className="h-5 w-5 shrink-0" />
                          My Profile
                        </Link>
                        <Link
                          to="/account/notifications"
                          className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-secondary hover:bg-gray-50 hover:text-primary sm:text-base"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Bell className="h-5 w-5 shrink-0" />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                        {showDashboard && (
                          <Link
                            to="/admin"
                            className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-secondary hover:bg-gray-50 hover:text-primary sm:text-base"
                            onClick={() => setMobileOpen(false)}
                          >
                            <LayoutDashboard className="h-5 w-5 shrink-0" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={handleLogoutClick}
                          className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 sm:text-base"
                        >
                          <LogOut className="h-5 w-5 shrink-0" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Link
                          to="/login"
                          className="flex min-h-12 items-center rounded-lg px-2 py-2 text-sm font-medium text-primary hover:bg-gray-50 sm:text-base"
                          onClick={() => setMobileOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/register"
                          className="flex min-h-12 items-center rounded-lg px-2 py-2 text-sm font-medium text-secondary hover:bg-gray-50 hover:text-primary sm:text-base"
                          onClick={() => setMobileOpen(false)}
                        >
                          Create Account
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                 <p className="text-xs text-tertiary text-center">
                   © {new Date().getFullYear()} AttireHub. All rights reserved.
                 </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleLogoutCancel}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 shadow-2xl"
            >
              <h2 className="text-lg font-brand font-medium text-primary">Sign Out</h2>
              <p className="mt-2 text-sm text-secondary">
                Are you sure you want to sign out of your account?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleLogoutCancel}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
