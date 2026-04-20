import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/layout/AuthLayout';
import * as authService from '@/services/authService';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phoneNumber: z.union([z.string().max(20, 'Phone number is too long'), z.literal('')]).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-primary placeholder-tertiary placeholder:text-xs sm:placeholder:text-[13px] outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

export default function RegisterPage() {
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const tokens = await authService.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber?.trim() || undefined,
      });
      navigate('/register/address', {
        state: {
          email: data.email,
          password: data.password,
          accessToken: tokens.accessToken,
        },
        replace: true,
      });
    } catch (err) {
      setAuthError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title="Create account" 
      subtitle="Join AttireHub for a better shopping experience"
      backgroundImage="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2020&auto=format&fit=crop"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence>
          {authError && (
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
                {authError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="register-firstName" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              First name
            </label>
            <input
              id="register-firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Enter your first name"
              className={getInputClassName(errors.firstName)}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="register-lastName" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              Last name
            </label>
            <input
              id="register-lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Enter your last name"
              className={getInputClassName(errors.lastName)}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="register-email" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Email address
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={getInputClassName(errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="register-phoneNumber" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Phone number <span className="text-tertiary normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="register-phoneNumber"
            type="tel"
            autoComplete="tel"
            placeholder="+1234567890"
            className={getInputClassName(errors.phoneNumber)}
            {...register('phoneNumber')}
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="register-password" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={`${getInputClassName(errors.password)} pr-10`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-tertiary transition-colors hover:text-primary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="register-confirmPassword" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="register-confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`${getInputClassName(errors.confirmPassword)} pr-10`}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-tertiary transition-colors hover:text-primary"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-none bg-primary py-4 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed mt-8"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="mt-8 text-center text-sm text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4 decoration-primary">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-tertiary">
          By creating an account, you agree to our terms of service and privacy policy.
        </p>
      </form>
    </AuthLayout>
  );
}
