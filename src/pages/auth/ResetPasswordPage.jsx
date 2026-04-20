import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { resetPassword } from '@/services/authService';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be at most 100 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  );

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') || '';
    setToken(t);
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSuccess(false);

    if (!token) {
      setServerError('Reset link is invalid or missing. Please request a new one.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, data.newPassword);
      setIsSuccess(true);
      reset({ newPassword: '', confirmPassword: '' });
      // Optionally redirect after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err) {
      setServerError(err?.message ?? 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasToken = Boolean(token && token.trim());

  return (
    <AuthLayout
      title="Reset password"
      subtitle={
        hasToken
          ? 'Choose a new password for your account.'
          : 'This reset link is invalid or has expired. Please request a new one.'
      }
    >
      {!hasToken ? (
        <div className="space-y-6">
          <div
            role="alert"
            className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100"
          >
            Reset link is invalid or missing. Please request a new password reset email.
          </div>
          <p className="text-sm text-secondary">
            You can request a new link from the{' '}
            <Link
              to="/forgot-password"
              className="font-medium text-primary hover:underline underline-offset-4 decoration-primary"
            >
              forgot password
            </Link>{' '}
            page.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100"
            >
              {serverError}
            </div>
          )}

          {isSuccess && !serverError && (
            <div
              role="status"
              className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-100"
            >
              Password has been reset successfully. Redirecting you to sign in…
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="new-password"
              className="block text-xs font-medium uppercase tracking-wider text-secondary"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${getInputClassName(errors.newPassword)} pr-10`}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-tertiary transition-colors hover:text-primary"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="confirm-password"
              className="block text-xs font-medium uppercase tracking-wider text-secondary"
            >
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-none bg-primary py-4 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating password…' : 'Reset password'}
          </button>

          <p className="mt-8 text-center text-sm text-secondary">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline underline-offset-4 decoration-primary"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

