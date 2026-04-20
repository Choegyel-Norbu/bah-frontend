import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import AccountLayout from '@/components/layout/AccountLayout';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/hooks/useCart';
import { getNotifications, getAdminNotifications } from '@/services/notificationService';

// Public pages
import HomePage from '@/pages/public/HomePage';
import ProductListPage from '@/pages/public/ProductListPage';
import ProductDetailPage from '@/pages/public/ProductDetailPage';
import CategoryPage from '@/pages/public/CategoryPage';
import SalesPage from '@/pages/public/SalesPage';
import SearchPage from '@/pages/public/SearchPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import RegisterAddressPage from '@/pages/auth/RegisterAddressPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Protected / account pages
import ProfilePage from '@/pages/account/ProfilePage';
import OrdersPage from '@/pages/account/OrdersPage';
import OrderDetailPage from '@/pages/account/OrderDetailPage';
import NotificationsPage from '@/pages/account/NotificationsPage';
import WishlistPage from '@/pages/account/WishlistPage';
import AccountSettingsPage from '@/pages/account/AccountSettingsPage';
import AccountAddressesPage from '@/pages/account/AccountAddressesPage';
import CartPage from '@/pages/cart/CartPage';
import CheckoutPage from '@/pages/checkout/CheckoutPage';

// Admin pages
import AdminLayout from '@/components/layout/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import AddProductPage from '@/pages/admin/AddProductPage';
import ProductManagementPage from '@/pages/admin/ProductManagementPage';
import EditProductPage from '@/pages/admin/EditProductPage';
import OrderManagementPage from '@/pages/admin/OrderManagementPage';

/** Syncs cart with auth: fetch cart when user logs in, clear when they log out. Must render inside both AuthProvider and CartProvider. */
function CartAuthSync() {
  const { isAuthenticated } = useAuth();
  const { fetchCart, clearCartState } = useCart();
  useEffect(() => {
    if (!isAuthenticated) {
      clearCartState();
      return;
    }
    fetchCart();
  }, [isAuthenticated, fetchCart, clearCartState]);
  return null;
}

function isAdmin(user) {
  return user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
}

function AdminNotificationsBootstrap() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isAdmin(user)) return;
    getAdminNotifications({ read: false, page: 0, size: 50 }).catch(() => {});
  }, [isAuthenticated, user]);

  return null;
}

function CustomerNotificationsBootstrap() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || isAdmin(user)) return;
    getNotifications({ read: false, size: 50 }).catch(() => {});
  }, [isAuthenticated, user]);

  return null;
}

function App() {
  return (
    <>
      <CartAuthSync />
      <AdminNotificationsBootstrap />
      <CustomerNotificationsBootstrap />
      <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/sale" element={<SalesPage />} />
            <Route path="/search" element={<SearchPage />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/address" element={<RegisterAddressPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route element={<AccountLayout />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/account/settings" element={<AccountSettingsPage />} />
                <Route path="/account/addresses" element={<AccountAddressesPage />} />
                <Route path="/account/orders" element={<OrdersPage />} />
                <Route path="/account/orders/:orderNumber" element={<OrderDetailPage />} />
                <Route path="/account/wishlist" element={<WishlistPage />} />
                <Route path="/account/notifications" element={<NotificationsPage />} />
              </Route>
            </Route>
            
            {/* Admin routes */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductManagementPage />} />
                <Route path="products/new" element={<AddProductPage />} />
                <Route path="products/edit/:slug" element={<EditProductPage />} />
                <Route path="orders" element={<OrderManagementPage />} />
              </Route>
            </Route>
          </Routes>
    </>
  );
}

export default App;
