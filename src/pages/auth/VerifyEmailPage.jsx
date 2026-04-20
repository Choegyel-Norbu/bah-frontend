import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import * as authService from '@/services/authService';

/**
 * Page reached when the user clicks the email verification link.
 * Reads token from ?token=... and calls POST /auth/verify-email.
 * Shows success, error, or "invalid link" when no token is present.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'no-token'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus('no-token');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setMessage('');

    authService
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) {
          setStatus('success');
          setMessage('Email verified successfully.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          setMessage(err?.message ?? 'Verification failed. Please try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const content = () => {
    if (status === 'no-token' || (status === 'idle' && !token)) {
      return (
        <div className="rounded-2xl border border-border bg-quaternary p-8 shadow-sm sm:p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-primary" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-primary">Invalid verification link</h2>
          <p className="mt-2 text-sm text-secondary">
            This link is invalid or incomplete. Please use the link from your verification email, or request a new one.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-quaternary hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex justify-center rounded-lg border border-border bg-quaternary px-4 py-2.5 text-sm font-medium text-primary hover:bg-tertiary/30"
            >
              Create account
            </Link>
          </div>
        </div>
      );
    }

    if (status === 'loading' || (status === 'idle' && token)) {
      return (
        <div className="rounded-2xl border border-border bg-quaternary p-8 shadow-sm sm:p-10 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-primary">Verifying your email…</h2>
          <p className="mt-2 text-sm text-secondary">Please wait a moment.</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="rounded-2xl border border-border bg-quaternary p-8 shadow-sm sm:p-10 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-primary">Email verified</h2>
          <p className="mt-2 text-sm text-secondary">{message}</p>
          <Link
            to="/login"
            className="mt-6 inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-quaternary hover:opacity-90"
          >
            Sign in to your account
          </Link>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="rounded-2xl border border-border bg-quaternary p-8 shadow-sm sm:p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-primary" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-primary">Verification failed</h2>
          <p className="mt-2 text-sm text-secondary" role="alert">
            {message}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-quaternary hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex justify-center rounded-lg border border-border bg-quaternary px-4 py-2.5 text-sm font-medium text-primary hover:bg-tertiary/30"
            >
              Create account
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <AuthLayout title="Verify email">
      <div className="w-full max-w-md">{content()}</div>
    </AuthLayout>
  );
}
