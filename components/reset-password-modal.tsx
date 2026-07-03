"use client";

import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { insforge } from "../app/lib/insforge";
import {
	Sparkles,
	Mail,
	Lock,
	ArrowRight,
	Loader2,
	Eye,
	EyeOff,
	X,
	CheckCircle2,
} from "lucide-react";

interface ResetPasswordModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function ResetPasswordModal({
	isOpen,
	onClose,
}: ResetPasswordModalProps) {
	const [step, setStep] = useState<1 | 2>(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Step 1 fields
	const [resetEmail, setResetEmail] = useState("");

	// Step 2 fields
	const [otp, setOtp] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const otpRef = useRef<HTMLInputElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) return;
		flushSync(() => {
			setStep(1);
			setLoading(false);
			setError(null);
			setSuccess(false);
			setResetEmail("");
			setOtp("");
			setNewPassword("");
			setConfirmPassword("");
			setShowNewPassword(false);
			setShowConfirmPassword(false);
		});
	}, [isOpen]);

	// Focus OTP input when step 2 opens
	useEffect(() => {
		if (step === 2 && otpRef.current) {
			otpRef.current.focus();
		}
	}, [step]);

	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [isOpen, onClose]);

	// Lock body scroll when open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	}, [isOpen]);

	// Trap focus inside modal
	useEffect(() => {
		if (!isOpen || !dialogRef.current) return;
		const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		const handleTab = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		document.addEventListener("keydown", handleTab);
		first?.focus();
		return () => document.removeEventListener("keydown", handleTab);
	}, [isOpen, step]);

	if (!isOpen) return null;

	// ─── Step 1: Send reset email ───────────────────────────────────────────
	const handleSendReset = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!resetEmail.trim()) {
			setError("Please enter your email address.");
			return;
		}
		setError(null);
		setLoading(true);

		try {
			const { error: sendError } = await insforge.auth.sendResetPasswordEmail({
				email: resetEmail.trim(),
			});

			if (sendError) {
				setError(
					sendError.message || "Failed to send reset email. Please try again.",
				);
			} else {
				setStep(2);
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// ─── Step 2: Verify OTP + Reset password ────────────────────────────────
	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (otp.trim().length === 0) {
			setError("Please enter the verification code.");
			return;
		}
		if (newPassword.length < 6) {
			setError("Password must be at least 6 characters long.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);

		try {
			const { error: resetError } = await insforge.auth.resetPassword({
				newPassword,
				otp: otp.trim(),
			});

			if (resetError) {
				setError(
					resetError.message ||
						"Failed to reset password. Please check your code and try again.",
				);
			} else {
				setSuccess(true);
				setTimeout(() => {
					onClose();
				}, 2500);
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="presentation">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="reset-modal-title"
				className="relative w-full max-w-md bg-white dark:bg-[#0d0d1a] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl z-10">
				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl -z-10 pointer-events-none" />

				{/* Close button */}
				<button
					onClick={onClose}
					className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
					aria-label="Close">
					<X className="w-5 h-5" />
				</button>

				{/* Header */}
				<div className="flex items-center space-x-3 mb-6">
					<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600">
						<Sparkles className="w-4 h-4 text-white" />
					</div>
					<div>
						<h2
							id="reset-modal-title"
							className="text-lg font-bold text-slate-800 dark:text-white">
							{success ? "Password Reset" : "Reset Your Password"}
						</h2>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							{step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
						</p>
					</div>
				</div>

				{/* Step progress bar */}
				<div className="flex gap-2 mb-6">
					<div
						className={`h-1 flex-1 rounded-full transition-colors ${
							step === 1 ? "bg-indigo-500" : "bg-indigo-500"
						}`}
					/>
					<div
						className={`h-1 flex-1 rounded-full transition-colors ${
							step === 2 ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"
						}`}
					/>
				</div>

				{/* Success state */}
				{success ?
					<div className="flex flex-col items-center py-4 text-center">
						<CheckCircle2 className="w-14 h-14 text-emerald-500 mb-4" />
						<h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">
							Password Updated!
						</h3>
						<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
							Your password has been changed successfully. Redirecting you to
							sign in&hellip;
						</p>
						<div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
					</div>
				:	<>
						{error && (
							<div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm">
								{error}
							</div>
						)}

						{/* ── Step 1: Email ────────────────────────────────────────── */}
						{step === 1 && (
							<form onSubmit={handleSendReset} className="space-y-5">
								<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
									Enter the email address associated with your account and
									we&apos;ll send you a verification code.
								</p>

								<div>
									<label
										htmlFor="reset-email"
										className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
										Email Address
									</label>
									<div className="relative">
										<input
											id="reset-email"
											type="email"
											required
											value={resetEmail}
											onChange={(e) => setResetEmail(e.target.value)}
											placeholder="name@example.com"
											autoComplete="email"
											className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
										/>
										<Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
									</div>
								</div>

								<button
									type="submit"
									disabled={loading}
									className="w-full inline-flex items-center justify-center h-11 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer">
									{loading ?
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Sending Code&hellip;
										</>
									:	<>
											Send Verification Code
											<ArrowRight className="w-4 h-4 ml-2" />
										</>
									}
								</button>

								<p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
									Remember your password?{" "}
									<button
										type="button"
										onClick={onClose}
										className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold cursor-pointer transition-colors">
										Sign In
									</button>
								</p>
							</form>
						)}

						{/* ── Step 2: OTP + New Password ───────────────────────────── */}
						{step === 2 && (
							<form onSubmit={handleResetPassword} className="space-y-5">
								<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
									A 6-digit verification code was sent to{" "}
									<span className="font-semibold text-slate-700 dark:text-slate-300">
										{resetEmail}
									</span>
									. Enter it below along with your new password.
								</p>

								{/* OTP */}
								<div>
									<label
										htmlFor="reset-otp"
										className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
										Verification Code
									</label>
									<input
										ref={otpRef}
										id="reset-otp"
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										required
										value={otp}
										onChange={(e) =>
											setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
										}
										placeholder="123456"
										autoComplete="one-time-code"
										className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-center text-lg tracking-[0.3em] font-mono text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
									/>
								</div>

								{/* New Password */}
								<div>
									<label
										htmlFor="reset-new-password"
										className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
										New Password
									</label>
									<div className="relative">
										<input
											id="reset-new-password"
											type={showNewPassword ? "text" : "password"}
											required
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											placeholder="Min. 6 characters"
											autoComplete="new-password"
											className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
										/>
										<Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
										<button
											type="button"
											onClick={() => setShowNewPassword((p) => !p)}
											className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
											aria-label={
												showNewPassword ? "Hide password" : "Show password"
											}>
											{showNewPassword ?
												<EyeOff className="w-4 h-4" />
											:	<Eye className="w-4 h-4" />}
										</button>
									</div>
								</div>

								{/* Confirm Password */}
								<div>
									<label
										htmlFor="reset-confirm-password"
										className="block text-xs font-semibold text-slate-650 dark:text-slate-300 uppercase tracking-wider mb-2">
										Confirm Password
									</label>
									<div className="relative">
										<input
											id="reset-confirm-password"
											type={showConfirmPassword ? "text" : "password"}
											required
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											placeholder="Repeat new password"
											autoComplete="new-password"
											className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
										/>
										<Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
										<button
											type="button"
											onClick={() => setShowConfirmPassword((p) => !p)}
											className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
											aria-label={
												showConfirmPassword ? "Hide password" : "Show password"
											}>
											{showConfirmPassword ?
												<EyeOff className="w-4 h-4" />
											:	<Eye className="w-4 h-4" />}
										</button>
									</div>
								</div>

								<button
									type="submit"
									disabled={loading}
									className="w-full inline-flex items-center justify-center h-11 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer">
									{loading ?
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Resetting Password&hellip;
										</>
									:	<>
											Reset Password
											<ArrowRight className="w-4 h-4 ml-2" />
										</>
									}
								</button>

								<p className="text-xs text-slate-500 dark:text-slate-400 text-center">
									<button
										type="button"
										onClick={() => setStep(1)}
										className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold cursor-pointer transition-colors">
										Use a different email
									</button>
								</p>
							</form>
						)}
					</>
				}
			</div>
		</div>
	);
}
