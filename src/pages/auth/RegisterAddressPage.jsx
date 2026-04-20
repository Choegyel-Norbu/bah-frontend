import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/layout/AuthLayout';
import * as addressService from '@/services/addressService';
import { addOrUpdateAddressInStorage } from '@/utils/addressStorage';

const ADDRESS_TYPES = [
  { value: 'SHIPPING', label: 'Shipping address' },
  { value: 'BILLING', label: 'Billing address' },
];

const addressSchema = z.object({
  addressType: z.enum(['SHIPPING', 'BILLING'], { required_error: 'Select an address type' }),
  streetAddress: z.string().min(1, 'Street address is required').max(255, 'Street address is too long'),
  city: z.string().min(1, 'City is required').max(100, 'City is too long'),
  state: z.string().min(1, 'State / province is required').max(100, 'State is too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code is too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country is too long'),
  isDefault: z.boolean().optional(),
});

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-0 py-3 text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

export default function RegisterAddressPage() {
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;

  useEffect(() => {
    if (!state?.accessToken || typeof state.email !== 'string' || typeof state.password !== 'string') {
      navigate('/register', { replace: true });
    }
  }, [state?.accessToken, state?.email, state?.password, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressType: 'SHIPPING',
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false,
    },
  });

  const onSubmit = async (data) => {
    if (!state?.accessToken) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await addressService.createAddress(
        {
          addressType: data.addressType,
          streetAddress: data.streetAddress.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          postalCode: data.postalCode.trim(),
          country: data.country.trim(),
          isDefault: Boolean(data.isDefault),
        },
        state.accessToken
      );
      addOrUpdateAddressInStorage(created);
      navigate('/login', {
        state: { email: state.email, password: state.password },
        replace: true,
      });
    } catch (err) {
      setSubmitError(err?.message ?? 'Could not save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!state?.accessToken) {
    return null;
  }

  return (
    <AuthLayout 
      title="Add your address" 
      subtitle="Complete your profile to start shopping"
      backgroundImage="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                role="alert"
                className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100"
              >
                {submitError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          <label htmlFor="address-type" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Address type
          </label>
          <select
            id="address-type"
            className={getInputClassName(errors.addressType)}
            {...register('addressType')}
          >
            {ADDRESS_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.addressType && (
            <p className="mt-1 text-xs text-red-500">{errors.addressType.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="street-address" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Street address
          </label>
          <input
            id="street-address"
            type="text"
            autoComplete="street-address"
            placeholder="123 Main Street, Apt 4"
            className={getInputClassName(errors.streetAddress)}
            {...register('streetAddress')}
          />
          {errors.streetAddress && (
            <p className="mt-1 text-xs text-red-500">{errors.streetAddress.message}</p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="city" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              City
            </label>
            <input
              id="city"
              type="text"
              autoComplete="address-level2"
              placeholder="New York"
              className={getInputClassName(errors.city)}
              {...register('city')}
            />
            {errors.city && (
              <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="state" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              State / Province
            </label>
            <input
              id="state"
              type="text"
              autoComplete="address-level1"
              placeholder="NY"
              className={getInputClassName(errors.state)}
              {...register('state')}
            />
            {errors.state && (
              <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="postal-code" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              Postal code
            </label>
            <input
              id="postal-code"
              type="text"
              autoComplete="postal-code"
              placeholder="10001"
              className={getInputClassName(errors.postalCode)}
              {...register('postalCode')}
            />
            {errors.postalCode && (
              <p className="mt-1 text-xs text-red-500">{errors.postalCode.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="country" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              Country
            </label>
            <input
              id="country"
              type="text"
              autoComplete="country-name"
              placeholder="United States"
              className={getInputClassName(errors.country)}
              {...register('country')}
            />
            {errors.country && (
              <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="is-default"
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-secondary"
            {...register('isDefault')}
          />
          <label htmlFor="is-default" className="text-sm font-medium text-primary cursor-pointer select-none">
            Set as default address
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-none bg-primary py-4 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed mt-8"
        >
          {isSubmitting ? 'Saving…' : 'Save address & continue'}
        </button>

        <p className="mt-6 text-center text-sm text-secondary">
          You’ll be redirected to sign in after saving your address.
        </p>
      </form>
    </AuthLayout>
  );
}
