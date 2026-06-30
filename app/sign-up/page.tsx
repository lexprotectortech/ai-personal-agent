'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '../lib/insforge';
import { useAuth } from '../components/auth-provider';
import { Sparkles, User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { user, setUser, syncUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If user is already signed in, redirect them to home/dashboard
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: `${window.location.origin}/sign-in`,
      });

      if (authError) {
        setError(authError.message || 'Registration failed. Please try again.');
      } else if (data?.requireEmailVerification) {
        // Redirect to verify-email page with prefilled email
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (data?.accessToken && data?.user) {
        // Direct login if email verification is not required
        setUser(data.user);
        await syncUser(data.user);
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { data, error: authError } = await insforge.auth.signInWithOAuth('google', {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: false
      });
      if (authError) {
        setError(authError.message || 'Google Sign-In failed.');
        setGoogleLoading(false);
      }
    } catch (err) {
      setError('Google Sign-In failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 filter blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer mb-2">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              OmniSync<span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">.AI</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-800 dark:text-white mt-4">Create Your Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Get started with your integrated AI personal assistant</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl dark:shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl -z-10 pointer-events-none" />

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Social Sign Up */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center h-12 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Sign Up with Google (Gmail)
          </button>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider">or continue with email</span>
            <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <User className="w-4 h-4 text-slate-400 dark:text-slate-505 absolute left-4 top-3.5" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full inline-flex items-center justify-center h-12 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-505 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
