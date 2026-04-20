import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthLayout from '@/components/layout/AuthLayout';
import { forgotPassword } from '@/services/authService';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSubmitted(false);
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (err) {
      setServerError(err?.message ?? 'Unable to send reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we will send you a link to reset your password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div
            role="alert"
            className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100"
          >
            {serverError}
          </div>
        )}

        {isSubmitted && !serverError && (
          <div
            role="status"
            className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-100"
          >
            If an account exists with this email, you will receive a password reset link.
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="forgot-email"
            className="block text-xs font-medium uppercase tracking-wider text-secondary"
          >
            Email address
          </label>
          <input
            id="forgot-email"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-none bg-primary py-4 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending link…' : 'Send reset link'}
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
    </AuthLayout>
  );
}