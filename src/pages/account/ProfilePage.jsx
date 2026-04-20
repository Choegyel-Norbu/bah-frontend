import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import * as addressService from '@/services/addressService';
import {
  getAddressesFromStorage,
  setAddressesInStorage,
} from '@/utils/addressStorage';
import { User, MapPin, Package, Settings, Edit, LogOut } from 'lucide-react';

function isAdmin(u) {
  return u?.role === 'ADMIN' || u?.role === 'ROLE_ADMIN';
}

function formatDisplayName(user) {
  if (!user) return '';
  const first = user.firstName ?? user.first_name ?? (user.name && user.name.split(' ')[0]) ?? '';
  const last = user.lastName ?? user.last_name ?? (user.name && user.name.split(' ').slice(1).join(' ')) ?? '';
  return [first, last].filter(Boolean).join(' ') || user.email || 'User';
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [addresses, setAddresses] = useState(() => getAddressesFromStorage());
  const [addressLoading, setAddressLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAddressLoading(true);
    addressService
      .getAddresses()
      .then((list) => {
        if (!cancelled) {
          setAddresses(list);
          setAddressesInStorage(list);
        }
      })
      .catch(() => {
        if (!cancelled) setAddresses(getAddressesFromStorage());
      })
      .finally(() => {
        if (!cancelled) setAddressLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const defaultAddress = addresses.find((a) => a.isDefault ?? a.default) ?? addresses[0];
  const displayName = formatDisplayName(authUser);
  const initials = getInitials(displayName);
  const email = authUser?.email ?? '';
  
  const isAdminUser = isAdmin(authUser);
  const menuItems = [
    {
      icon: Package,
      label: isAdminUser ? 'Customer Orders' : 'Orders',
      to: isAdminUser ? '/admin/orders' : '/account/orders',
      description: isAdminUser
        ? 'View and manage orders placed by customers'
        : 'Track, return, or buy things again',
    },
    { icon: Settings, label: 'Settings', to: '/account/settings', description: 'Edit profile, password, and preferences' },
    // { icon: CreditCard, label: 'Payment Methods', to: '/account/payment', description: 'Manage saved cards' },
  ];

  if (isAdminUser) {
    menuItems.unshift({
      icon: User,
      label: 'Admin Dashboard',
      to: '/admin/products',
      description: 'Manage products and store settings',
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 flex flex-col items-center text-center sm:flex-row sm:text-left sm:gap-8"
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-brand font-medium text-white shadow-xl sm:h-32 sm:w-32 sm:text-4xl">
          {initials}
        </div>
        
        <div className="mt-6 sm:mt-0">
          <h1 className="font-brand text-3xl text-primary sm:text-4xl">
            Welcome back, {displayName.split(' ')[0]}
          </h1>
          <p className="mt-2 text-secondary/70">{email}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Link
              to="/account/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-secondary hover:text-primary hover:bg-gray-50"
              aria-label="Edit profile"
              title="Edit profile"
            >
              <Edit className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('request-logout'))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Dashboard links */}
      <div className="space-y-3 sm:space-y-4">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <Link
              to={item.to}
              className="group flex items-center justify-between rounded-xl bg-white px-4 py-3 text-left transition-colors hover:bg-primary/3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:h-10 sm:w-10">
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-brand text-sm text-primary sm:text-base">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-secondary/70 sm:text-xs line-clamp-2">{item.description}</p>
                </div>
              </div>
              <span className="ml-3 text-xs font-medium text-secondary/60 group-hover:text-primary hidden xs:inline">
                View
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Default Address Preview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-10 rounded-xl bg-white px-4 py-4 sm:px-5 sm:py-5"
      >
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-brand text-base text-primary sm:text-lg">Default address</h2>
              <p className="mt-0.5 text-[11px] text-secondary/70 sm:text-xs">
                Used for shipping unless you choose another at checkout.
              </p>
            </div>
            <Link
              to="/account/settings#addresses"
              className="text-[11px] font-medium text-primary underline underline-offset-4 hover:text-secondary"
            >
              Manage
            </Link>
          </div>

          <div className="mt-4">
          {addressLoading ? (
            <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
          ) : defaultAddress ? (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">
                  {defaultAddress.streetAddress ?? defaultAddress.street_address}
                </p>
                <p className="mt-0.5 text-xs text-secondary/80">
                  {[
                    defaultAddress.city,
                    defaultAddress.state,
                    defaultAddress.postalCode ?? defaultAddress.postal_code,
                    defaultAddress.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary/60">No default address set yet.</p>
          )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
