'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '../lib/insforge';
import { useAuth } from '../components/auth-provider';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Phone, 
  MessageSquare, 
  MessageCircle, 
  ArrowLeft 
} from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { user, setUser, syncUser } = useAuth();
  
  // Tabs: 'credentials' (Email/Google) vs 'phone' (Phone number authentication)
  const [authMethod, setAuthMethod] = useState<'credentials' | 'phone'>('credentials');
  
  // Credentials Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone Form States
  const [phone, setPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  // General UI States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If user is already signed in, redirect them to home/dashboard
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Submit handler for Email/Password Sign In
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await insforge.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid login credentials.');
      } else if (data?.user) {
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

  // Google Sign In
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

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter your phone number with country code (e.g. +1234567890).');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, method: verificationMethod })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code. Please check your number.');
      } else {
        setOtpSent(true);
      }
    } catch (err) {
      setError('An error occurred while sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Authenticate User
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const verifyResponse = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.error || 'Verification failed. Please try again.');
        setLoading(false);
        return;
      }

      const { email: dummyEmail, tempPassword } = verifyData;

      // Authenticate with InsForge
      // Try logging in first
      let authResult = await insforge.auth.signInWithPassword({
        email: dummyEmail,
        password: tempPassword
      });

      if (authResult.error) {
        // If user not found, sign them up (auto-registration)
        console.log('Phone user not found in InsForge auth, registering now...');
        const signUpResult = await insforge.auth.signUp({
          email: dummyEmail,
          password: tempPassword,
          name: `User ${phone.slice(-4)}`
        });

        if (signUpResult.error) {
          setError(signUpResult.error.message || 'Failed to create user session.');
          setLoading(false);
          return;
        }

        // Try logging in again after signup
        authResult = await insforge.auth.signInWithPassword({
          email: dummyEmail,
          password: tempPassword
        });
      }

      if (authResult.data?.user) {
        setUser(authResult.data.user);
        // Synchronize and update phone user data in users table
        await syncUser(authResult.data.user, { phone, method: verificationMethod });
        router.push('/');
      } else {
        setError(authResult.error?.message || 'Authentication failed.');
      }

    } catch (err) {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 filter blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer mb-2">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              OmniSync<span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">.AI</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-800 dark:text-white mt-4">Welcome Back</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sign in to your integrated personal AI agent</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl dark:shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl -z-10 pointer-events-none" />

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Authentication Method Selector Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-xl mb-6">
            <button
              onClick={() => {
                setAuthMethod('credentials');
                setError(null);
              }}
              disabled={loading || googleLoading}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMethod === 'credentials' 
                  ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-white/10' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Email & Google
            </button>
            <button
              onClick={() => {
                setAuthMethod('phone');
                setError(null);
              }}
              disabled={loading || googleLoading}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMethod === 'phone' 
                  ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-white/10' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Phone OTP
            </button>
          </div>

          {/* Email / Google Authentication Form */}
          {authMethod === 'credentials' && (
            <>
              {/* Social Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center h-12 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
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
                Sign In with Google (Gmail)
              </button>

              {/* Divider */}
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider">or continue with email</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                  </div>
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
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Phone OTP Authentication Form */}
          {authMethod === 'phone' && (
            <>
              {!otpSent ? (
                /* Step 1: Input Phone & Choose Method */
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Phone Number (with Country Code)
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Include plus sign and country code (e.g. +1 for USA, +91 for India).
                    </p>
                  </div>

                  {/* Channel Choice */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-3">
                      Verification Channel
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setVerificationMethod('sms')}
                        className={`flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          verificationMethod === 'sms'
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerificationMethod('whatsapp')}
                        className={`flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          verificationMethod === 'whatsapp'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-455'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp OTP
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center h-12 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Input OTP Code */
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="text-center mb-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      We sent a 6-digit verification code to
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      {phone}
                    </p>
                    <span className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 bg-indigo-500/5 px-2.5 py-1 rounded-full border border-indigo-500/10">
                      Via {verificationMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                    </span>
                  </div>

                  <div>
                    <label htmlFor="otpCode" className="block text-xs font-semibold text-slate-655 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                      Enter Verification Code
                    </label>
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-center text-xl font-bold tracking-[0.5em] text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="flex flex-col space-y-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center h-12 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Sign In
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full flex items-center justify-center h-10 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                      Change Phone Number
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-505 dark:text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
