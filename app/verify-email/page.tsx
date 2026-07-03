"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { insforge } from "../lib/insforge";
import { useAuth } from "../../components/auth-provider";
import {
	Sparkles,
	Mail,
	CheckCircle2,
	ArrowRight,
	Loader2,
	RefreshCw,
} from "lucide-react";

function VerifyEmailForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { setUser, syncUser } = useAuth();

	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [resendLoading, setResendLoading] = useState(false);

	useEffect(() => {
		const emailParam = searchParams.get("email");
		if (emailParam) {
			setEmail(emailParam);
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !otp) {
			setError("Please fill in both fields.");
			return;
		}
		setError(null);
		setSuccess(null);
		setLoading(true);

		try {
			const { data, error: authError } = await insforge.auth.verifyEmail({
				email,
				otp,
			});

			if (authError) {
				setError(
					authError.message || "Verification failed. Please check the code.",
				);
			} else if (data?.user) {
				setSuccess("Email verified successfully!");
				setUser(data.user);
				await syncUser(data.user);

				// Wait a brief moment for the user to see the success message
				setTimeout(() => {
					router.push("/");
				}, 1500);
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (!email) {
			setError("Please enter your email to resend the code.");
			return;
		}
		setError(null);
		setSuccess(null);
		setResendLoading(true);

		try {
			const { data, error: authError } =
				await insforge.auth.resendVerificationEmail({
					email,
				});

			if (authError) {
				setError(authError.message || "Failed to resend verification email.");
			} else if (data?.success) {
				setSuccess("A new 6-digit code has been sent to your email.");
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setResendLoading(false);
		}
	};

	return (
		<div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl dark:shadow-2xl relative">
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl -z-10 pointer-events-none" />

			{error && (
				<div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm text-center">
					{error}
				</div>
			)}

			{success && (
				<div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-sm text-center">
					{success}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-5">
				<div>
					<label
						htmlFor="email"
						className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
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
						<Mail className="w-4 h-4 text-slate-400 dark:text-slate-550 absolute left-4 top-3.5" />
					</div>
				</div>

				<div>
					<label
						htmlFor="otp"
						className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
						6-Digit Verification Code
					</label>
					<input
						id="otp"
						type="text"
						required
						maxLength={6}
						value={otp}
						onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
						placeholder="123456"
						className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono tracking-[0.5em] text-slate-850 dark:text-white placeholder-slate-405 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || resendLoading}
					className="w-full inline-flex items-center justify-center h-12 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer">
					{loading ?
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Verifying...
						</>
					:	<>
							Verify Email
							<ArrowRight className="w-4 h-4 ml-2" />
						</>
					}
				</button>
			</form>

			{/* Resend button */}
			<div className="flex justify-center mt-6">
				<button
					type="button"
					onClick={handleResend}
					disabled={loading || resendLoading}
					className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-white transition-colors cursor-pointer">
					<RefreshCw
						className={`w-3.5 h-3.5 mr-2 ${resendLoading ? "animate-spin" : ""}`}
					/>
					Resend Verification Code
				</button>
			</div>
		</div>
	);
}

export default function VerifyEmailPage() {
	return (
		<div className="relative min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
			{/* Background blurs */}
			<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 filter blur-[150px] pointer-events-none" />
			<div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 filter blur-[150px] pointer-events-none" />

			<div className="w-full max-w-md z-10">
				{/* Logo/Brand */}
				<div className="flex flex-col items-center mb-8">
					<Link
						href="/"
						className="flex items-center space-x-3 group cursor-pointer mb-2">
						<div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
							<Sparkles className="w-5 h-5 text-white animate-pulse" />
							<div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
						</div>
						<span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
							OmniSync
							<span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
								.AI
							</span>
						</span>
					</Link>
					<h2 className="text-2xl font-bold font-display tracking-tight text-slate-800 dark:text-white mt-4">
						Verify Your Email
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
						Enter the 6-digit verification code sent to your inbox
					</p>
				</div>

				{/* Suspense is required in App Router for useSearchParams */}
				<Suspense
					fallback={
						<div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 backdrop-blur-md flex flex-col items-center justify-center h-48 shadow-sm">
							<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
							<span className="text-sm text-slate-500 dark:text-slate-400 mt-4">
								Loading verification form...
							</span>
						</div>
					}>
					<VerifyEmailForm />
				</Suspense>

				{/* Footer link */}
				<p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
					Need to make changes?{" "}
					<Link
						href="/sign-up"
						className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold transition-colors">
						Back to Sign Up
					</Link>
				</p>
			</div>
		</div>
	);
}
