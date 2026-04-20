import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/layout/AuthLayout';
import { useAuth } from '@/context/AuthContext';

/** Returns webmail inbox URL for the given email, or Gmail as fallback. */
function getInboxUrl(email) {
  if (!email || typeof email !== 'string') return 'https://mail.google.com';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com';
  if (['outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com', 'outlook.co.uk'].includes(domain)) return 'https://outlook.live.com';
  if (domain.includes('yahoo')) return 'https://mail.yahoo.com';
  return 'https://mail.google.com';
}

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

export default function LoginPage() {
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(null); // { message, email } when 403
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefilled = location.state && typeof location.state === 'object' ? location.state : {};

  const closeEmailNotVerifiedDialog = () => setEmailNotVerified(null);

  const openInbox = () => {
    if (emailNotVerified?.email) {
      window.open(getInboxUrl(emailNotVerified.email), '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://mail.google.com', '_blank', 'noopener,noreferrer');
    }
    closeEmailNotVerifiedDialog();
  };

  useEffect(() => {
    if (!emailNotVerified) return;
    const onEscape = (e) => {
      if (e.key === 'Escape') closeEmailNotVerifiedDialog();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [emailNotVerified]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: typeof prefilled.email === 'string' ? prefilled.email : '',
      password: typeof prefilled.password === 'string' ? prefilled.password : '',
    },
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.statusCode === 403) {
        setEmailNotVerified({
          message: err.message,
          email: data.email,
        });
        setAuthError(null);
      } else {
        setAuthError(err?.message ?? 'Sign in failed. Please check your email and password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Sign in to your account to continue"
      backgroundImage="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop"
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

        <div className="space-y-1">
          <label htmlFor="login-email" className="block text-xs font-medium uppercase tracking-wider text-secondary">
            Email address
          </label>
          <input
            id="login-email"
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
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-medium uppercase tracking-wider text-secondary">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-secondary hover:text-primary transition-colors underline decoration-transparent hover:decoration-current"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-none bg-primary py-4 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-8 text-center text-sm text-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline underline-offset-4 decoration-primary">
            Sign up
          </Link>
        </p>
      </form>

      {/* Email Verification Modal */}
      {emailNotVerified &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeEmailNotVerifiedDialog}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden bg-white shadow-2xl"
            >
              <div className="p-8 text-center">
                <h2 className="text-xl font-brand text-primary mb-2">
                  Verify your email
                </h2>
                <p className="text-sm text-secondary mb-8 leading-relaxed">
                  {emailNotVerified.message}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={openInbox}
                    className="w-full bg-primary py-3 text-sm font-medium uppercase tracking-widest text-white hover:bg-black transition-colors"
                  >
                    Open email inbox
                  </button>
                  <button
                    type="button"
                    onClick={closeEmailNotVerifiedDialog}
                    className="w-full border border-border bg-transparent py-3 text-sm font-medium uppercase tracking-widest text-primary hover:bg-secondary/5 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </AuthLayout>
  );
}
