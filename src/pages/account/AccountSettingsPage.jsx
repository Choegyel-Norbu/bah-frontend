import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import * as userService from '@/services/userService';
import * as addressService from '@/services/addressService';
import {
  getAddressesFromStorage,
  setAddressesInStorage,
  addOrUpdateAddressInStorage,
} from '@/utils/addressStorage';
import { Settings, Loader2, MapPin, Pencil, Trash2, Star, Plus, Check } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

const ADDRESS_TYPES = [
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'BILLING', label: 'Billing' },
];

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'Too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Too long'),
  phoneNumber: z.union([z.string().max(20, 'Phone number is too long'), z.literal('')]).optional(),
});

const addressSchema = z.object({
  addressType: z.enum(['SHIPPING', 'BILLING'], { required_error: 'Select type' }),
  streetAddress: z.string().min(1, 'Street address is required').max(255, 'Too long'),
  city: z.string().min(1, 'City is required').max(100, 'Too long'),
  state: z.string().min(1, 'State / province is required').max(100, 'Too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Too long'),
  isDefault: z.boolean().optional(),
});

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-sm text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

function AddressFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-14 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-10 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="pt-4">
        <div className="h-10 w-36 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

function getDefaultProfileValues(user) {
  if (!user) return { firstName: '', lastName: '', phoneNumber: '' };
  const firstName = user.firstName ?? user.first_name ?? (user.name && user.name.split(' ')[0]) ?? '';
  const lastName = user.lastName ?? user.last_name ?? (user.name && user.name.split(' ').slice(1).join(' ')) ?? '';
  const phoneNumber = user.phoneNumber ?? user.phone_number ?? '';
  return { firstName, lastName, phoneNumber };
}

const emptyAddress = {
  addressType: 'SHIPPING',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
};

export default function AccountSettingsPage() {
  const { user: authUser, updateUser } = useAuth();
  const { show: showToast } = useToast();
  const [addresses, setAddresses] = useState(() => getAddressesFromStorage());
  const [profileError, setProfileError] = useState(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [addressError, setAddressError] = useState(null);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: getDefaultProfileValues(authUser),
  });

  const addressForm = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddress,
  });

  const location = useLocation();

  useEffect(() => {
    if (location.hash !== '#addresses') return;
    const el = document.getElementById('addresses');
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    userService
      .getProfile()
      .then((profile) => {
        if (!cancelled) profileForm.reset(getDefaultProfileValues(profile));
      })
      .catch(() => {
        if (!cancelled) profileForm.reset(getDefaultProfileValues(authUser));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [authUser, profileForm.reset]);

  useEffect(() => {
    let cancelled = false;
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
      });
    return () => { cancelled = true; };
  }, []);

  const syncAddressesFromStorage = () => setAddresses(getAddressesFromStorage());

  const onProfileSubmit = async (data) => {
    setProfileError(null);
    setProfileSubmitting(true);
    try {
      const updated = await userService.updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phoneNumber: data.phoneNumber?.trim() || undefined,
      });
      updateUser(updated);
      showToast({ message: 'Profile updated.', variant: 'success' });
      profileForm.reset(getDefaultProfileValues(updated));
    } catch (err) {
      setProfileError(err?.message ?? 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onAddressSubmit = async (data) => {
    setAddressError(null);
    setAddressSubmitting(true);
    const payload = {
      addressType: data.addressType,
      streetAddress: data.streetAddress.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      postalCode: data.postalCode.trim(),
      country: data.country.trim(),
      isDefault: Boolean(data.isDefault),
    };

    if (editingAddressId != null) {
      try {
        let updated = await addressService.updateAddress(editingAddressId, {
          ...payload,
          streetAddress: payload.streetAddress,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country,
          isDefault: payload.isDefault,
        });

        if (payload.isDefault) {
          updated = await addressService.setDefaultAddress(editingAddressId);
        }
        
        const list = getAddressesFromStorage();
        const idx = list.findIndex((a) => a?.id === editingAddressId || a?.id === String(editingAddressId));
        if (idx >= 0) {
          let next = list.slice();
          if (updated.isDefault) {
             next = next.map((a) => ({ ...a, isDefault: a.id === updated.id }));
          }
          next[idx] = updated;
          setAddressesInStorage(next);
          syncAddressesFromStorage();
        }
        
        showToast({ message: 'Address updated.', variant: 'success' });
        addressForm.reset(emptyAddress);
        setEditingAddressId(null);
        setShowAddressForm(false);
      } catch (err) {
         console.error("Failed to update address on server", err);
         setAddressError(err?.message ?? 'Failed to update address.');
      }
    } else {
      try {
        const created = await addressService.createAddress({
          ...payload,
          streetAddress: payload.streetAddress,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country,
          isDefault: payload.isDefault,
        });
        addOrUpdateAddressInStorage(created);
      } catch {
        const localId = `local-${Date.now()}`;
        addOrUpdateAddressInStorage({ ...payload, id: localId, street_address: payload.streetAddress, postal_code: payload.postalCode });
        showToast({ message: 'Address saved locally.', variant: 'success' });
      }
      syncAddressesFromStorage();
      addressForm.reset(emptyAddress);
      setShowAddressForm(false);
    }
    setAddressSubmitting(false);
  };

  const setDefaultAddress = async (id) => {
    try {
      await addressService.setDefaultAddress(id);
      
      const list = getAddressesFromStorage().map((a) => ({
        ...a,
        isDefault: a.id === id || a.id === String(id),
      }));
      setAddressesInStorage(list);
      syncAddressesFromStorage();
      showToast({ message: 'Default address updated.', variant: 'success' });
    } catch (err) {
      console.error("Failed to set default address on server", err);
      showToast({ message: err?.message ?? 'Failed to set default address.', variant: 'error' });
    }
  };

  const requestRemoveAddress = (addr) => setAddressToDelete(addr);

  const cancelRemoveAddress = () => setAddressToDelete(null);

  useEffect(() => {
    if (!addressToDelete) return;
    const onEscape = (e) => {
      if (e.key === 'Escape') cancelRemoveAddress();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [addressToDelete]);

  const confirmRemoveAddress = async () => {
    if (!addressToDelete) return;
    const id = addressToDelete.id;
    const isLocalOnly = String(id).startsWith('local-');
    setDeleteConfirming(true);
    try {
      if (!isLocalOnly) {
        await addressService.deleteAddress(id);
      }
      const list = getAddressesFromStorage().filter((a) => a.id !== id && a.id !== String(id));
      setAddressesInStorage(list);
      syncAddressesFromStorage();
      if (editingAddressId === id) {
        addressForm.reset(emptyAddress);
        setEditingAddressId(null);
        setShowAddressForm(false);
      }
      showToast({ message: 'Address removed.', variant: 'success' });
      setAddressToDelete(null);
    } catch (err) {
      showToast({ message: err?.message ?? 'Failed to remove address.', variant: 'error' });
    } finally {
      setDeleteConfirming(false);
    }
  };

  const startEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    addressForm.reset({
      addressType: addr.addressType ?? addr.address_type ?? 'SHIPPING',
      streetAddress: addr.streetAddress ?? addr.street_address ?? '',
      city: addr.city ?? '',
      state: addr.state ?? '',
      postalCode: addr.postalCode ?? addr.postal_code ?? '',
      country: addr.country ?? '',
      isDefault: Boolean(addr.isDefault ?? addr.default),
    });
    setShowAddressForm(true);
    // Scroll to form
    setTimeout(() => {
      document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const email = authUser?.email ?? '';

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div>
        <h1 className="font-brand text-xl text-primary">Settings</h1>
        <p className="mt-0.5 text-xs text-secondary/70">
          Manage your personal information and delivery addresses.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Profile Section */}
          <section>
            <div className="mb-6 border-b border-border pb-4">
              <h2 className="text-lg font-medium text-primary">Personal Profile</h2>
            </div>
            
            {profileLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
              </div>
            ) : (
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <AnimatePresence>
                  {profileError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                        {profileError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="settings-firstName" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      First Name
                    </label>
                    <input
                      id="settings-firstName"
                      type="text"
                      autoComplete="given-name"
                      className={getInputClassName(profileForm.formState.errors.firstName)}
                      {...profileForm.register('firstName')}
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="mt-1 text-xs text-red-500">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="settings-lastName" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Last Name
                    </label>
                    <input
                      id="settings-lastName"
                      type="text"
                      autoComplete="family-name"
                      className={getInputClassName(profileForm.formState.errors.lastName)}
                      {...profileForm.register('lastName')}
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="mt-1 text-xs text-red-500">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="settings-email" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                    Email Address
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    disabled
                    className="w-full border-b border-border bg-transparent px-3 py-3 text-sm text-primary/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="settings-phone" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                    Phone Number <span className="normal-case tracking-normal text-tertiary">(Optional)</span>
                  </label>
                  <input
                    id="settings-phone"
                    type="tel"
                    autoComplete="tel"
                    className={getInputClassName(profileForm.formState.errors.phoneNumber)}
                    {...profileForm.register('phoneNumber')}
                  />
                  {profileForm.formState.errors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-500">{profileForm.formState.errors.phoneNumber.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileSubmitting || !profileForm.formState.isDirty}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Addresses Section */}
          <section id="addresses">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-medium text-primary">Saved Addresses</h2>
              {!showAddressForm && (
                <button
                  onClick={() => {
                    setEditingAddressId(null);
                    addressForm.reset(emptyAddress);
                    setShowAddressForm(true);
                    setTimeout(() => {
                      document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </button>
              )}
            </div>

            <div className="space-y-4">
              {addresses.length === 0 && !showAddressForm && (
                <div className="rounded-lg border border-dashed border-border bg-gray-50/50 p-8 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-tertiary/50" />
                  <p className="mt-2 text-sm text-secondary">No addresses saved yet.</p>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {addresses.map((addr) => {
                  const isDefault = addr.isDefault ?? addr.default;
                  const isEditing = editingAddressId === (addr.id ?? String(addr.id));
                  
                  if (isEditing) return null; // Hide card when editing

                  return (
                    <motion.div
                      key={addr.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className={`relative rounded-xl border p-5 transition-all ${
                        isDefault ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">
                              {addr.addressType ?? addr.address_type}
                            </span>
                            {isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-secondary">
                            {addr.streetAddress ?? addr.street_address}
                          </p>
                          <p className="text-sm text-secondary">
                            {[
                              addr.city,
                              addr.state,
                              addr.postalCode ?? addr.postal_code,
                              addr.country
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Tooltip text="Edit" side="top">
                            <button
                              onClick={() => startEditAddress(addr)}
                              className="rounded-full p-2 text-secondary hover:bg-gray-100 hover:text-primary transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          {!isDefault && (
                            <Tooltip text="Make Default" side="top">
                              <button
                                onClick={() => setDefaultAddress(addr.id)}
                                className="rounded-full p-2 text-secondary hover:bg-gray-100 hover:text-primary transition-colors"
                              >
                                <Star className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip text="Remove" side="top">
                            <button
                              onClick={() => requestRemoveAddress(addr)}
                              className="rounded-full p-2 text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Address Form */}
              <AnimatePresence>
                {showAddressForm && (
                  <motion.div
                    id="address-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-xl border border-border bg-gray-50/50"
                  >
                    <div className="p-6">
                      {addressSubmitting ? (
                        <AddressFormSkeleton />
                      ) : (
                        <>
                          <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-brand text-lg text-primary">
                              {editingAddressId ? 'Edit Address' : 'New Address'}
                            </h3>
                            <button 
                              onClick={() => {
                                setShowAddressForm(false);
                                setEditingAddressId(null);
                                addressForm.reset(emptyAddress);
                              }}
                              className="text-xs font-bold uppercase tracking-wider text-secondary hover:text-primary"
                            >
                              Cancel
                            </button>
                          </div>

                          <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-5">
                            {addressError && (
                              <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                                {addressError}
                              </div>
                            )}

                            <div className="grid gap-5 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Type</label>
                                <select 
                                  className={getInputClassName(addressForm.formState.errors.addressType)} 
                                  {...addressForm.register('addressType')}
                                >
                                  {ADDRESS_TYPES.map(({ value, label }) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Country</label>
                                <input 
                                  type="text" 
                                  autoComplete="country-name" 
                                  className={getInputClassName(addressForm.formState.errors.country)} 
                                  {...addressForm.register('country')} 
                                />
                                {addressForm.formState.errors.country && <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.country.message}</p>}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Street Address</label>
                              <input
                                type="text"
                                autoComplete="street-address"
                                className={getInputClassName(addressForm.formState.errors.streetAddress)}
                                {...addressForm.register('streetAddress')}
                              />
                              {addressForm.formState.errors.streetAddress && (
                                <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.streetAddress.message}</p>
                              )}
                            </div>

                            <div className="grid gap-5 sm:grid-cols-3">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium uppercase tracking-wider text-secondary">City</label>
                                <input 
                                  type="text" 
                                  autoComplete="address-level2" 
                                  className={getInputClassName(addressForm.formState.errors.city)} 
                                  {...addressForm.register('city')} 
                                />
                                {addressForm.formState.errors.city && <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.city.message}</p>}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium uppercase tracking-wider text-secondary">State / Province</label>
                                <input 
                                  type="text" 
                                  autoComplete="address-level1" 
                                  className={getInputClassName(addressForm.formState.errors.state)} 
                                  {...addressForm.register('state')} 
                                />
                                {addressForm.formState.errors.state && <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.state.message}</p>}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Postal Code</label>
                                <input 
                                  type="text" 
                                  autoComplete="postal-code" 
                                  className={getInputClassName(addressForm.formState.errors.postalCode)} 
                                  {...addressForm.register('postalCode')} 
                                />
                                {addressForm.formState.errors.postalCode && <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.postalCode.message}</p>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <input
                                id="addr-default"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                                {...addressForm.register('isDefault')}
                              />
                              <label htmlFor="addr-default" className="text-sm text-primary cursor-pointer select-none">Set as default address</label>
                            </div>

                            <div className="pt-4">
                              <button
                                type="submit"
                                disabled={addressSubmitting}
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-secondary disabled:opacity-50"
                              >
                                {editingAddressId != null ? 'Update Address' : 'Save Address'}
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Sidebar / Info */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-gray-50/50 p-6">
            <h3 className="font-brand text-lg text-primary">Need Help?</h3>
            <p className="mt-2 text-sm text-secondary/80 leading-relaxed">
              If you have questions about your account or need assistance with an order, our support team is here to help.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-primary">
                <span className="font-medium">Email:</span>
                <a href="mailto:support@attirehub.com" className="hover:underline">support@attirehub.com</a>
              </div>
              <div className="flex items-center gap-3 text-primary">
                <span className="font-medium">Phone:</span>
                <span>+975 17 12 34 56</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete address confirmation dialog */}
      <AnimatePresence>
        {addressToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={cancelRemoveAddress}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 shadow-2xl"
            >
              <h2 className="text-base font-brand text-primary">Remove Address?</h2>
              <p className="mt-2 text-xs text-secondary/80 leading-relaxed">
                Are you sure you want to remove this address? This action cannot be undone.
              </p>
              <div className="mt-4 rounded-lg bg-gray-50 p-3 border border-border">
                <p className="font-medium text-sm text-primary">
                  {addressToDelete.streetAddress ?? addressToDelete.street_address}
                </p>
                <p className="mt-0.5 text-xs text-secondary">
                  {[addressToDelete.city, addressToDelete.state].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={cancelRemoveAddress}
                  disabled={deleteConfirming}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveAddress}
                  disabled={deleteConfirming}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-70"
                >
                  {deleteConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
