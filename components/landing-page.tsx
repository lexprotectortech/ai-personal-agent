"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import {
	MessageSquare,
	Mail,
	Send,
	Calendar,
	CheckCircle2,
	Lock,
	Sliders,
	Sparkles,
	Clock,
	ArrowRight,
	ChevronDown,
	Check,
	Zap,
	Shield,
	Activity,
	ArrowUpRight,
	Menu,
	X,
	Bell,
	CheckSquare,
	Sun,
	Moon,
} from "lucide-react";

// Mock data for the simulator.
// When integrations are toggled, we simulate feeds on the right panel.
interface FeedItem {
	id: string;
	source: "whatsapp" | "gmail" | "telegram" | "outlook";
	sender: string;
	time: string;
	originalText: string;
	aiOutput: {
		summary: string;
		actionItems: string[];
		draftReply?: string;
	};
}

const SIMULATED_FEEDS: Record<string, FeedItem> = {
	whatsapp: {
		id: "wa-1",
		source: "whatsapp",
		sender: "Product Launch Group",
		time: "Just now",
		originalText:
			"Abhijit: Hey guys, we need to finalize the landing page copy by tonight. Sarah, can you share your draft? Also, let's schedule a call tomorrow at 10 AM to sync up. I will review the logo mockups that Abhijit uploaded.",
		aiOutput: {
			summary:
				"Group sync regarding landing page copy finalization. Meeting proposed for tomorrow morning.",
			actionItems: [
				"Sarah to share landing page copy draft (Due: Tonight)",
				"Schedule sync call (Proposed: Tomorrow, 10:00 AM)",
				"Review uploaded logo mockups",
			],
			draftReply:
				"Sounds good, Sarah. Please send the link once ready. I'll block 10 AM tomorrow for the call!",
		},
	},
	gmail: {
		id: "gm-1",
		source: "gmail",
		sender: "david.harris@apexventures.com",
		time: "5m ago",
		originalText:
			"Subject: Follow-up on Q3 Investment Deck\n\nHi team, thanks for sending over the deck. I reviewed the numbers on page 14 and they look solid. Could you send over the detailed financial sheet by Friday? If so, we can proceed with drafting the term sheet.",
		aiOutput: {
			summary:
				"Investor feedback on Q3 deck. Requesting detailed financials to proceed with the term sheet.",
			actionItems: [
				"Send detailed financial spreadsheet to David Harris (Due: Friday)",
			],
			draftReply:
				"Hi David, glad you liked the deck. I will compile the detailed financials and send them over by Thursday morning. Thanks!",
		},
	},
	telegram: {
		id: "tg-1",
		source: "telegram",
		sender: "Solana Dev Community",
		time: "12m ago",
		originalText:
			"Mod_Ivan: ⚠️ Notice: The mainnet devnet upgrade is scheduled for June 30th at 14:00 UTC. Node operators must update to v1.18.15 to prevent desyncing. Detailed instructions are in the pinned blog post.",
		aiOutput: {
			summary: "Devnet network upgrade notice for node operators on June 30th.",
			actionItems: [
				"Update mainnet devnet nodes to version v1.18.15 (Due: June 30th, 14:00 UTC)",
			],
		},
	},
	outlook: {
		id: "ol-1",
		source: "outlook",
		sender: "Microsoft Outlook Calendar",
		time: "30m ago",
		originalText:
			"Event Invite: Q3 Roadmap Alignment Session\nOrganizer: Elena Rostova\nTime: Tomorrow, 2:00 PM - 3:30 PM\nConflict: Overlaps with weekly design critique session.",
		aiOutput: {
			summary:
				"Calendar conflict detected for tomorrow afternoon between Q3 Roadmap Alignment and Weekly Design Critique.",
			actionItems: [
				"Resolve schedule overlap for tomorrow 2:00 PM",
				"Respond to Elena Rostova's invitation",
			],
			draftReply:
				"Hi Elena, I have a conflict at 2 PM tomorrow with our design critique. Would 3:30 PM work instead, or should I delegate the design review?",
		},
	},
};

export default function LandingPage() {
	const { user, loading, signOut } = useAuth();
	// Mobile menu state
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	// Theme state
	const [theme, setTheme] = useState<"light" | "dark">("dark");

	useEffect(() => {
		const savedTheme = localStorage.getItem("theme") as "light" | "dark";
		const isDark = document.documentElement.classList.contains("dark");
		const initialTheme = savedTheme || (isDark ? "dark" : "light");
		setTheme(initialTheme);
		if (initialTheme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, []);

	const toggleTheme = () => {
		const nextTheme = theme === "dark" ? "light" : "dark";
		setTheme(nextTheme);
		localStorage.setItem("theme", nextTheme);
		if (nextTheme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	};

	// Integrations state
	const [connections, setConnections] = useState({
		whatsapp: true,
		gmail: true,
		telegram: false,
		outlook: false,
	});

	// Current active tab in integrations deep-dive
	const [activeDeepDive, setActiveDeepDive] = useState<
		"whatsapp" | "gmail" | "telegram" | "outlook"
	>("whatsapp");

	// FAQ Accordion state
	const [openFaq, setOpenFaq] = useState<number | null>(0);

	// Simulation timeline details
	const [activeSimFeed, setActiveSimFeed] = useState<FeedItem | null>(null);

	// Newsletter form state
	const [newsletterEmail, setNewsletterEmail] = useState("");
	const [newsletterSuccess, setNewsletterSuccess] = useState(false);

	// Auto-rotate or set initial simulation item on connection change
	useEffect(() => {
		const activeKeys = Object.entries(connections)
			.filter(([_, isConnected]) => isConnected)
			.map(([key]) => key);

		if (activeKeys.length > 0) {
			// Pick first connected as active display
			const firstActive = activeKeys[0];
			setActiveSimFeed(SIMULATED_FEEDS[firstActive]);
		} else {
			setActiveSimFeed(null);
		}
	}, [connections]);

	const toggleConnection = (key: keyof typeof connections) => {
		setConnections((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const handleNewsletterSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (newsletterEmail) {
			setNewsletterSuccess(true);
			setTimeout(() => {
				setNewsletterSuccess(false);
				setNewsletterEmail("");
			}, 4000);
		}
	};

	const faqs = [
		{
			question: "How does OmniSync AI connect to my accounts?",
			answer:
				"OmniSync uses official OAuth 2.0 protocols for Gmail and Outlook, and secure API gateways for Telegram. For WhatsApp, we utilize safe business-level or personal sandbox endpoints. We never store your passwords; your authorization is handled token-by-token with fully revocable keys.",
		},
		{
			question: "Does the AI read all my private messages?",
			answer:
				"No. You have absolute control. You can set filter configurations (e.g., 'Only analyze emails marked urgent', 'Only summarize WhatsApp group chats named Project Sync'). Processing is performed instantly and we do not store chat logs on our servers post-processing.",
		},
		{
			question: "Can I customize what actions the AI takes?",
			answer:
				"Absolutely. You can define rules for each channel. For WhatsApp, you might want a 'TL;DR group digest at 6 PM daily'. For Gmail, you could configure it to 'Auto-draft friendly professional responses to clients' or 'Flag calendar invites that conflict with family time'.",
		},
		{
			question: "Is my data secure?",
			answer:
				"Security is our highest priority. All raw data payload text processed by the AI is encrypted in transit and in memory using AES-256. We operate under SOC2 Type II guidelines. Your workspace information is never used to train public LLM models.",
		},
		{
			question: "What is the setup time?",
			answer:
				"Under 2 minutes. Connecting a channel requires just a few clicks to authorize. Once connected, your personal agent begins syncing in the background instantly.",
		},
	];

	return (
		<div className="relative min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] overflow-x-hidden transition-colors duration-300">
			{/* Mesh Background Blurs */}
			<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 filter blur-[150px] animate-pulse-slow pointer-events-none" />
			<div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 filter blur-[150px] animate-pulse-slow pointer-events-none" />
			<div className="absolute bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-cyan-500/2 dark:bg-cyan-500/5 filter blur-[180px] pointer-events-none" />

			{/* Header */}
			<header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-200/60 dark:border-white/5 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
					<div className="flex items-center space-x-3 group cursor-pointer">
						<div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
							<Sparkles className="w-5 h-5 text-white animate-pulse" />
							<div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
						</div>
						<span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">
							OmniSync
							<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
								.AI
							</span>
						</span>
					</div>

					{/* Desktop Navigation */}
					<nav className="hidden lg:flex items-center space-x-8">
						<a
							href="#simulator"
							className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
							Live Demo
						</a>
						<a
							href="#features"
							className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
							Features
						</a>
						<a
							href="#integrations"
							className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
							Integrations
						</a>
						<a
							href="#how-it-works"
							className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
							How It Works
						</a>
						<a
							href="#faq"
							className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200">
							FAQ
						</a>
					</nav>

					{/* Theme Toggle & Action Buttons */}
					<div className="hidden lg:flex items-center space-x-4">
						<button
							onClick={toggleTheme}
							className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
							aria-label="Toggle theme">
							{theme === "dark" ?
								<Sun className="w-4 h-4" />
							:	<Moon className="w-4 h-4" />}
						</button>
						{loading ?
							<div className="w-20 h-8 bg-white/5 animate-pulse rounded-lg" />
						: user ?
							<div className="flex items-center space-x-4">
								<span className="text-sm text-slate-600 dark:text-slate-300">
									Hi,{" "}
									<span className="font-semibold text-indigo-600 dark:text-indigo-400">
										{user.profile?.name || user.email.split("@")[0]}
									</span>
								</span>
								<Link
									href="/dashboard"
									className="glow-btn inline-flex items-center justify-center px-4 h-10 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-300">
									Dashboard
								</Link>
								<button
									onClick={signOut}
									className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition duration-200">
									Sign Out
								</button>
							</div>
						:	<>
								<Link
									href="/sign-in"
									className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors duration-200">
									Sign In
								</Link>
								<Link
									href="/sign-up"
									className="glow-btn inline-flex items-center justify-center px-5 h-11 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-300">
									Get Started Free
									<ArrowRight className="w-4 h-4 ml-2" />
								</Link>
							</>
						}
					</div>

					{/* Mobile/Tablet Menu Button & Theme Toggle */}
					<div className="flex lg:hidden items-center space-x-2">
						<button
							onClick={toggleTheme}
							className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
							aria-label="Toggle theme">
							{theme === "dark" ?
								<Sun className="w-4.5 h-4.5" />
							:	<Moon className="w-4.5 h-4.5" />}
						</button>
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
							aria-label="Toggle menu">
							{mobileMenuOpen ?
								<X className="w-6 h-6" />
							:	<Menu className="w-6 h-6" />}
						</button>
					</div>
				</div>

				{/* Mobile/Tablet Dropdown Menu */}
				{mobileMenuOpen && (
					<div className="lg:hidden glass-panel border-b border-white/10 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-300">
						<a
							href="#simulator"
							onClick={() => setMobileMenuOpen(false)}
							className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
							Live Demo
						</a>
						<a
							href="#features"
							onClick={() => setMobileMenuOpen(false)}
							className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
							Features
						</a>
						<a
							href="#integrations"
							onClick={() => setMobileMenuOpen(false)}
							className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
							Integrations
						</a>
						<a
							href="#how-it-works"
							onClick={() => setMobileMenuOpen(false)}
							className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
							How It Works
						</a>
						<a
							href="#faq"
							onClick={() => setMobileMenuOpen(false)}
							className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
							FAQ
						</a>
						<div className="pt-4 flex flex-col space-y-2 border-t border-white/5">
							{loading ?
								<div className="w-full h-10 bg-white/5 animate-pulse rounded-lg" />
							: user ?
								<div className="flex flex-col space-y-2 px-3">
									<span className="text-sm text-slate-300 text-center py-1">
										Signed in as{" "}
										<span className="font-semibold text-indigo-400">
											{user.profile?.name || user.email}
										</span>
									</span>
									<Link
										href="/dashboard"
										onClick={() => setMobileMenuOpen(false)}
										className="w-full py-3 text-center text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 block">
										Go to Dashboard
									</Link>
									<button
										onClick={() => {
											signOut();
											setMobileMenuOpen(false);
										}}
										className="w-full py-3 text-center text-base font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
										Sign Out
									</button>
								</div>
							:	<>
									<Link
										href="/sign-in"
										onClick={() => setMobileMenuOpen(false)}
										className="block w-full px-3 py-2 text-center text-base font-medium text-slate-300 hover:text-white rounded-lg transition-colors">
										Sign In
									</Link>
									<Link
										href="/sign-up"
										onClick={() => setMobileMenuOpen(false)}
										className="block w-full py-3 text-center text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
										Get Started Free
									</Link>
								</>
							}
						</div>
					</div>
				)}
			</header>

			{/* Hero Section */}
			<section className="relative pt-12 pb-20 md:pt-20 md:pb-28">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					{/* Badge */}
					<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-6 animate-pulse">
						<Sparkles className="w-3.5 h-3.5 text-indigo-400" />
						<span>Integrate Your Inbox & Chats with AI</span>
					</div>

					{/* Heading */}
					<h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight sm:leading-none">
						<span className="text-gradient">One Personal AI Agent.</span>
						<br />
						<span className="text-gradient-purple-blue">
							Synced With Your Digital Life.
						</span>
					</h1>

					{/* Description */}
					<p className="mt-6 text-base sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
						Connect{" "}
						<strong className="text-slate-800 dark:text-slate-200">
							WhatsApp
						</strong>
						,{" "}
						<strong className="text-slate-800 dark:text-slate-200">
							Gmail
						</strong>
						,{" "}
						<strong className="text-slate-800 dark:text-slate-200">
							Telegram
						</strong>
						, and{" "}
						<strong className="text-slate-800 dark:text-slate-200">
							Outlook
						</strong>{" "}
						to an autonomous AI assistant. Let it generate actionable digests,
						draft answers, schedule reminders, and filter noise automatically.
					</p>

					{/* CTAs */}
					<div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
						<a
							href="#cta"
							className="glow-btn w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all duration-300">
							Start Syncing Free
							<ArrowRight className="w-5 h-5 ml-2" />
						</a>
						<a
							href="#simulator"
							className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 backdrop-blur-sm">
							Play with Demo
						</a>
					</div>

					{/* Social Proof Badges */}
					<div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
						<span>🛡️ SOC2 Compliant Pipeline</span>
						<span>•</span>
						<span>🔒 AES-256 E2E Encryption</span>
						<span>•</span>
						<span>⚡ Real-Time Processing</span>
					</div>
				</div>
			</section>

			{/* Simulator Section (Interactive Experience) */}
			<section
				id="simulator"
				className="py-16 md:py-24 relative border-t border-white/5">
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none" />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
							See OmniSync AI in Action
						</h2>
						<p className="mt-4 text-slate-505 dark:text-slate-400">
							Toggle the messaging apps and email accounts on the left to see
							how your autonomous AI agent analyzes communication, generates
							summaries, schedules reminders, and drafts smart follow-ups.
						</p>
					</div>

					{/* Interactive Playground Container */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
						{/* Left Control Panel: Connect toggles */}
						<div className="lg:col-span-5 md:col-span-12 flex flex-col space-y-4 justify-center">
							<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 px-1">
								Workspace Integrations
							</h3>

							{/* WhatsApp Toggle Card */}
							<div
								className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
									connections.whatsapp ?
										"bg-brand-whatsapp/5 border-brand-whatsapp/30 shadow-[0_0_15px_rgba(37,211,102,0.05)]"
									:	"bg-slate-100/50 dark:bg-white/2 border-slate-200 dark:border-white/5 opacity-65 hover:opacity-100"
								}`}
								onClick={() => toggleConnection("whatsapp")}>
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<div
											className={`p-3 rounded-xl ${connections.whatsapp ? "bg-brand-whatsapp text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"}`}>
											<MessageSquare className="w-6 h-6" />
										</div>
										<div>
											<h4 className="font-semibold text-slate-800 dark:text-slate-200">
												WhatsApp
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												Group Chats & Personal Chats
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded-full ${connections.whatsapp ? "bg-brand-whatsapp/15 text-brand-whatsapp" : "bg-slate-200 dark:bg-white/5 text-slate-500"}`}>
											{connections.whatsapp ? "Connected" : "Disconnected"}
										</span>
										<button
											className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
												connections.whatsapp ? "bg-brand-whatsapp" : (
													"bg-slate-200 dark:bg-white/10"
												)
											}`}>
											<span
												className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													connections.whatsapp ? "translate-x-5" : (
														"translate-x-0"
													)
												}`}
											/>
										</button>
									</div>
								</div>
							</div>

							{/* Gmail Toggle Card */}
							<div
								className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
									connections.gmail ?
										"bg-brand-gmail/5 border-brand-gmail/30 shadow-[0_0_15px_rgba(234,67,53,0.05)]"
									:	"bg-slate-100/50 dark:bg-white/2 border-slate-200 dark:border-white/5 opacity-65 hover:opacity-100"
								}`}
								onClick={() => toggleConnection("gmail")}>
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<div
											className={`p-3 rounded-xl ${connections.gmail ? "bg-brand-gmail text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"}`}>
											<Mail className="w-6 h-6" />
										</div>
										<div>
											<h4 className="font-semibold text-slate-800 dark:text-slate-200">
												Gmail
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												Primary Inbox & Flagged
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded-full ${connections.gmail ? "bg-brand-gmail/15 text-brand-gmail font-semibold" : "bg-slate-200 dark:bg-white/5 text-slate-500"}`}>
											{connections.gmail ? "Connected" : "Disconnected"}
										</span>
										<button
											className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
												connections.gmail ? "bg-brand-gmail" : (
													"bg-slate-200 dark:bg-white/10"
												)
											}`}>
											<span
												className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													connections.gmail ? "translate-x-5" : "translate-x-0"
												}`}
											/>
										</button>
									</div>
								</div>
							</div>

							{/* Telegram Toggle Card */}
							<div
								className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
									connections.telegram ?
										"bg-brand-telegram/5 border-brand-telegram/30 shadow-[0_0_15px_rgba(36,161,222,0.05)]"
									:	"bg-slate-100/50 dark:bg-white/2 border-slate-200 dark:border-white/5 opacity-65 hover:opacity-100"
								}`}
								onClick={() => toggleConnection("telegram")}>
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<div
											className={`p-3 rounded-xl ${connections.telegram ? "bg-brand-telegram text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"}`}>
											<Send className="w-6 h-6" />
										</div>
										<div>
											<h4 className="font-semibold text-slate-800 dark:text-slate-200">
												Telegram
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												Channels, Groups & Directs
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded-full ${connections.telegram ? "bg-brand-telegram/15 text-brand-telegram" : "bg-slate-200 dark:bg-white/5 text-slate-500"}`}>
											{connections.telegram ? "Connected" : "Disconnected"}
										</span>
										<button
											className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
												connections.telegram ? "bg-brand-telegram" : (
													"bg-slate-200 dark:bg-white/10"
												)
											}`}>
											<span
												className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													connections.telegram ? "translate-x-5" : (
														"translate-x-0"
													)
												}`}
											/>
										</button>
									</div>
								</div>
							</div>

							{/* Outlook Toggle Card */}
							<div
								className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
									connections.outlook ?
										"bg-brand-outlook/5 border-brand-outlook/30 shadow-[0_0_15px_rgba(0,120,212,0.05)]"
									:	"bg-slate-100/50 dark:bg-white/2 border-slate-200 dark:border-white/5 opacity-65 hover:opacity-100"
								}`}
								onClick={() => toggleConnection("outlook")}>
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<div
											className={`p-3 rounded-xl ${connections.outlook ? "bg-brand-outlook text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"}`}>
											<Calendar className="w-6 h-6" />
										</div>
										<div>
											<h4 className="font-semibold text-slate-800 dark:text-slate-200">
												Outlook & Exchange
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												Emails, Calendar & Tasks
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded-full ${connections.outlook ? "bg-brand-outlook/15 text-brand-outlook" : "bg-slate-200 dark:bg-white/5 text-slate-500"}`}>
											{connections.outlook ? "Connected" : "Disconnected"}
										</span>
										<button
											className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
												connections.outlook ? "bg-brand-outlook" : (
													"bg-slate-200 dark:bg-white/10"
												)
											}`}>
											<span
												className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													connections.outlook ? "translate-x-5" : (
														"translate-x-0"
													)
												}`}
											/>
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Right Display Panel: Simulated AI Feed */}
						<div className="lg:col-span-7 md:col-span-12">
							<div className="glass-panel w-full rounded-3xl border border-slate-200 dark:border-white/10 h-full flex flex-col overflow-hidden shadow-2xl relative">
								{/* Simulator Title Bar */}
								<div className="bg-slate-100 dark:bg-white/3 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
									<div className="flex items-center space-x-3">
										<span className="flex h-2.5 w-2.5 relative">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
											<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
										</span>
										<span className="text-xs font-bold uppercase tracking-wider text-slate-750 dark:text-slate-300">
											OmniSync Live Feed Simulator
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 rounded-full bg-red-500/60" />
										<div className="w-3 h-3 rounded-full bg-yellow-500/60" />
										<div className="w-3 h-3 rounded-full bg-green-500/60" />
									</div>
								</div>

								{/* Simulated Output Content */}
								<div className="p-6 flex-1 flex flex-col justify-start overflow-y-auto space-y-6">
									{activeSimFeed ?
										<div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
											{/* Incoming Notification Segment */}
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
														Incoming Payload
													</span>
													<span className="text-xs text-slate-500">
														{activeSimFeed.time}
													</span>
												</div>
												<div className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/3 border border-slate-200 dark:border-white/5 flex items-start space-x-3">
													<div className="mt-1">
														{activeSimFeed.source === "whatsapp" && (
															<MessageSquare className="w-4 h-4 text-brand-whatsapp" />
														)}
														{activeSimFeed.source === "gmail" && (
															<Mail className="w-4 h-4 text-brand-gmail" />
														)}
														{activeSimFeed.source === "telegram" && (
															<Send className="w-4 h-4 text-brand-telegram" />
														)}
														{activeSimFeed.source === "outlook" && (
															<Calendar className="w-4 h-4 text-brand-outlook" />
														)}
													</div>
													<div>
														<p className="text-xs font-bold text-slate-800 dark:text-slate-200">
															{activeSimFeed.sender}
														</p>
														<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
															{activeSimFeed.originalText}
														</p>
													</div>
												</div>
											</div>

											{/* AI Extraction Arrow */}
											<div className="flex justify-center my-2">
												<div className="flex flex-col items-center">
													<div className="h-4 w-px bg-gradient-to-b from-indigo-500 to-purple-500" />
													<div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center space-x-1 shadow-md shadow-indigo-500/10">
														<Sparkles className="w-3 h-3 text-white animate-spin" />
														<span>OmniSync Agent Executed</span>
													</div>
													<div className="h-4 w-px bg-gradient-to-b from-purple-500 to-indigo-500" />
												</div>
											</div>

											{/* AI Output Segment */}
											<div className="space-y-4">
												{/* Summary Block */}
												<div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
													<h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide flex items-center">
														<Zap className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400" />
														AI Summary Digest
													</h5>
													<p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed font-medium">
														{activeSimFeed.aiOutput.summary}
													</p>
												</div>

												{/* Action Items Block */}
												<div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
													<h5 className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wide flex items-center">
														<CheckSquare className="w-3.5 h-3.5 mr-1 text-purple-500 dark:text-purple-400" />
														Extracted Reminders & Actions
													</h5>
													<ul className="mt-2 space-y-2">
														{activeSimFeed.aiOutput.actionItems.map(
															(item, index) => (
																<li
																	key={index}
																	className="flex items-start text-xs text-slate-700 dark:text-slate-300">
																	<span className="text-purple-500 mr-2 font-bold">
																		•
																	</span>
																	<span className="leading-relaxed">
																		{item}
																	</span>
																</li>
															),
														)}
													</ul>
												</div>

												{/* Smart Draft Reply Block */}
												{activeSimFeed.aiOutput.draftReply && (
													<div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
														<div className="flex items-center justify-between mb-2">
															<h5 className="text-xs font-bold text-cyan-600 dark:text-cyan-300 uppercase tracking-wide flex items-center">
																<Mail className="w-3.5 h-3.5 mr-1 text-cyan-500 dark:text-cyan-400" />
																Smart Draft Reply
															</h5>
															<button className="text-[10px] px-2 py-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/30 text-cyan-705 dark:text-cyan-200 border border-cyan-500/20 dark:border-cyan-500/30 rounded font-bold transition-all duration-200 cursor-pointer">
																Send Draft
															</button>
														</div>
														<p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed bg-slate-100 dark:bg-black/30 p-2.5 rounded border border-slate-200 dark:border-white/5 font-mono">
															"{activeSimFeed.aiOutput.draftReply}"
														</p>
													</div>
												)}
											</div>
										</div>
									:	<div className="flex-1 flex flex-col items-center justify-center text-center p-8">
											<div className="p-4 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 mb-4 animate-bounce">
												<Sliders className="w-8 h-8 text-indigo-500" />
											</div>
											<h4 className="font-semibold text-slate-800 dark:text-slate-300">
												Workspace is Idle
											</h4>
											<p className="text-sm text-slate-500 mt-2 max-w-sm">
												Toggle one of the integrations on the left panel to
												active to watch the AI simulation parse incoming
												signals.
											</p>
										</div>
									}
								</div>

								{/* Simulator Footer Selector */}
								{activeSimFeed && (
									<div className="bg-slate-100/50 dark:bg-white/2 px-6 py-3 flex items-center justify-between border-t border-slate-200 dark:border-white/5">
										<span className="text-[10px] text-slate-500 uppercase tracking-wide">
											Select active channel to review:
										</span>
										<div className="flex space-x-2">
											{Object.entries(connections)
												.filter(([_, active]) => active)
												.map(([key]) => (
													<button
														key={key}
														onClick={() =>
															setActiveSimFeed(SIMULATED_FEEDS[key])
														}
														className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
															activeSimFeed.source === key ?
																"bg-indigo-600 text-white"
															:	"bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10"
														}`}>
														{key.toUpperCase()}
													</button>
												))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Grid Features Section */}
			<section id="features" className="py-20 md:py-28 relative">
				{/* Glow */}
				<div className="absolute top-[20%] left-[-5%] w-[400px] h-[400px] bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none" />

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-20">
						<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-650 dark:text-purple-300 text-xs font-semibold tracking-wide uppercase mb-4">
							<span>Features Blueprint</span>
						</div>
						<h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
							Supercharge Your Digital Workflow
						</h2>
						<p className="mt-4 text-slate-505 dark:text-slate-400">
							OmniSync operates behind the scenes, connecting your communication
							stacks. Say goodbye to scattered messaging logs and manually
							setting alerts.
						</p>
					</div>

					{/* Grid Layout */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{/* Feature 1 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<Sparkles className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
								Intelligent Action Extraction
							</h3>
							<p className="mt-3 text-sm text-slate-505 dark:text-slate-400 leading-relaxed">
								OmniSync automatically monitors texts like "Draft proposal by
								Friday" or "Schedule review tomorrow" and constructs action card
								templates automatically.
							</p>
						</div>

						{/* Feature 2 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<MessageSquare className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
								Noise Filtration & Filters
							</h3>
							<p className="mt-3 text-sm text-slate-505 dark:text-slate-400 leading-relaxed">
								Eliminate spam. Program the agent to only focus on updates from
								key clients, project members, or specific keywords to protect
								your focus focus areas.
							</p>
						</div>

						{/* Feature 3 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<Mail className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
								Context-Aware Replies
							</h3>
							<p className="mt-3 text-sm text-slate-505 dark:text-slate-400 leading-relaxed">
								Draft emails and texts in your own personalized tone of voice.
								OmniSync analyzes historical communication records to draft
								tailored responses.
							</p>
						</div>

						{/* Feature 4 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<Clock className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-955 dark:group-hover:text-white transition-colors duration-200">
								Daily Digests & Summary
							</h3>
							<p className="mt-3 text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
								Get a clean daily summary sent straight to your WhatsApp or
								inbox every morning, showing what happened across channels and
								priority actions.
							</p>
						</div>

						{/* Feature 5 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<Shield className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
								Enterprise Shield Security
							</h3>
							<p className="mt-3 text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
								Your keys, your access. We implement end-to-end encrypted
								tunnels. Your private data is never retained, indexed, or shared
								with third-party providers.
							</p>
						</div>

						{/* Feature 6 */}
						<div className="glass-panel glass-panel-hover p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-tr-3xl" />
							<div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-6 group-hover:scale-110 transition-transform duration-300">
								<Activity className="w-6 h-6" />
							</div>
							<h3 className="text-xl font-bold text-slate-805 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
								Cross-Platform Synergy
							</h3>
							<p className="mt-3 text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
								Refer to Outlook calendars while answering client emails, or
								extract information from WhatsApp chats to construct task logs
								in real-time.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Integration Tabbed Details Section */}
			<section
				id="integrations"
				className="py-20 md:py-28 bg-white/[0.01] border-y border-white/5 relative">
				<div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none" />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
							Fine-Tuned for Each Channel
						</h2>
						<p className="mt-4 text-slate-505 dark:text-slate-400">
							Explore the dedicated capabilities of each connection. Switch tabs
							below to see how OmniSync adapts to each service.
						</p>
					</div>

					{/* Selector Tabs */}
					<div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-12">
						{[
							{
								id: "whatsapp",
								label: "WhatsApp Chat",
								icon: MessageSquare,
								color: "text-brand-whatsapp",
								border: "hover:border-brand-whatsapp/50",
							},
							{
								id: "gmail",
								label: "Gmail Workspace",
								icon: Mail,
								color: "text-brand-gmail",
								border: "hover:border-brand-gmail/50",
							},
							{
								id: "telegram",
								label: "Telegram Sync",
								icon: Send,
								color: "text-brand-telegram",
								border: "hover:border-brand-telegram/50",
							},
							{
								id: "outlook",
								label: "Outlook & Office",
								icon: Calendar,
								color: "text-brand-outlook",
								border: "hover:border-brand-outlook/50",
							},
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveDeepDive(tab.id as any)}
								className={`flex items-center space-x-2 px-5 py-3 rounded-xl border transition-all duration-300 text-sm font-semibold cursor-pointer ${
									activeDeepDive === tab.id ?
										"bg-slate-205 dark:bg-white/5 text-slate-800 dark:text-white border-slate-350 dark:border-white/20"
									:	`bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/2 hover:text-slate-800 dark:hover:text-slate-200 ${tab.border}`
								}`}>
								<tab.icon className={`w-4 h-4 ${tab.color}`} />
								<span>{tab.label}</span>
							</button>
						))}
					</div>

					{/* Deep Dive Tab Card */}
					<div className="glass-panel rounded-3xl border border-white/10 p-8 sm:p-12">
						{activeDeepDive === "whatsapp" && (
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
								<div className="lg:col-span-7 md:col-span-12 space-y-6">
									<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-brand-whatsapp/30 bg-brand-whatsapp/5 text-brand-whatsapp text-xs font-semibold uppercase tracking-wide">
										<span>Active Messenger Integration</span>
									</div>
									<h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
										Summarize Messy Group Chats & Extract Action Items
									</h3>
									<p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
										Group chats move fast. OmniSync monitors designated WhatsApp
										chats, identifies decisions, pulls task commitments, and
										translates everything into structured bulletins.
									</p>
									<ul className="space-y-3">
										{[
											"Select which groups or contacts the AI agent has permission to track.",
											"Receive bulleted summaries to catch up in seconds.",
											"Extract dates, deadlines, and automatically format tasks.",
										].map((bullet, idx) => (
											<li
												key={idx}
												className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
												<CheckCircle2 className="w-5 h-5 text-brand-whatsapp shrink-0 mt-0.5" />
												<span>{bullet}</span>
											</li>
										))}
									</ul>
								</div>
								<div className="lg:col-span-5 md:col-span-12 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden">
									<div className="absolute top-0 right-0 p-2 bg-brand-whatsapp/20 text-brand-whatsapp rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
										Live Demo
									</div>
									<h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
										Sample Setup
									</h4>
									<div className="space-y-4">
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-whatsapp">
												Rule 1: Focus Filter
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Only process chats containing keywords: #urgent, #task,
												#todo, #contract.
											</p>
										</div>
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-whatsapp">
												Rule 2: Daily Digest
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Compile and send a daily TL;DR to my personal DM at 6:00
												PM every evening.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{activeDeepDive === "gmail" && (
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
								<div className="lg:col-span-7 md:col-span-12 space-y-6">
									<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-brand-gmail/30 bg-brand-gmail/5 text-brand-gmail text-xs font-semibold uppercase tracking-wide">
										<span>Email Sync Engine</span>
									</div>
									<h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
										Auto-Draft Context-Aware Responses & Inbox Sorting
									</h3>
									<p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
										Keep your inbox clean. OmniSync reads incoming emails,
										references external contexts (e.g. your Telegram logs,
										WhatsApp agreements, or calendars) and drafts detailed
										replies in your specific tone of voice.
									</p>
									<ul className="space-y-3">
										{[
											"Write contextual replies based on your past responses.",
											"Instantly flag high-importance emails requiring immediate human triage.",
											"Synchronize attachment follow-ups and file actions to external logs.",
										].map((bullet, idx) => (
											<li
												key={idx}
												className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
												<CheckCircle2 className="w-5 h-5 text-brand-gmail shrink-0 mt-0.5" />
												<span>{bullet}</span>
											</li>
										))}
									</ul>
								</div>
								<div className="lg:col-span-5 md:col-span-12 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden">
									<div className="absolute top-0 right-0 p-2 bg-brand-gmail/20 text-brand-gmail rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
										Security Active
									</div>
									<h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
										Sample Setup
									</h4>
									<div className="space-y-4">
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-gmail">
												System Prompt Profile
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												"Always reply in a professional, brief, friendly tone.
												Refer to schedule details to verify availability."
											</p>
										</div>
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-gmail">
												Smart Integration
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Cross-check calendar invites with Outlook to
												automatically resolve conflicts.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{activeDeepDive === "telegram" && (
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
								<div className="lg:col-span-7 md:col-span-12 space-y-6">
									<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-brand-telegram/30 bg-brand-telegram/5 text-brand-telegram text-xs font-semibold uppercase tracking-wide">
										<span>Crypto & Dev Hub Sync</span>
									</div>
									<h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
										Monitor Channels, Alerts & Developer Alerts
									</h3>
									<p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
										For communities and development ecosystems running on
										Telegram, stay updated without getting lost. Parse key logs,
										release notifications, and team updates in real-time.
									</p>
									<ul className="space-y-3">
										{[
											"Monitor developer updates, announcements, and channel notifications.",
											"Receive push summaries of major channel alerts straight to your workspace.",
											"Extract dates for project milestones, developer calls, and governance updates.",
										].map((bullet, idx) => (
											<li
												key={idx}
												className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
												<CheckCircle2 className="w-5 h-5 text-brand-telegram shrink-0 mt-0.5" />
												<span>{bullet}</span>
											</li>
										))}
									</ul>
								</div>
								<div className="lg:col-span-5 md:col-span-12 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden">
									<div className="absolute top-0 right-0 p-2 bg-brand-telegram/20 text-brand-telegram rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
										Realtime Sync
									</div>
									<h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
										Sample Setup
									</h4>
									<div className="space-y-4">
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-telegram">
												Channel Alerts
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Track key release tags: #announcement, #security,
												#critical, #upgrade.
											</p>
										</div>
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-telegram">
												Task Auto-Push
											</p>
											<p className="text-xs text-slate-505 dark:text-slate-400 mt-1">
												Send dev tasks directly to project trackers when
												milestone dates are identified.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{activeDeepDive === "outlook" && (
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
								<div className="lg:col-span-7 md:col-span-12 space-y-6">
									<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-brand-outlook/30 bg-brand-outlook/5 text-brand-outlook text-xs font-semibold uppercase tracking-wide">
										<span>Office & Calendar Sync</span>
									</div>
									<h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
										Synchronize Schedule Conflicts & Corporate Emails
									</h3>
									<p className="text-slate-505 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
										Avoid calendar overlaps. OmniSync tracks your calendar logs,
										identifies scheduling conflicts, and proposes draft replies
										or rescheduling alternatives instantly.
									</p>
									<ul className="space-y-3">
										{[
											"Map calendar overlaps and trigger alert responses automatically.",
											"Verify corporate follow-ups and schedule milestones.",
											"Synchronize tasks directly with Microsoft To Do and Teams.",
										].map((bullet, idx) => (
											<li
												key={idx}
												className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
												<CheckCircle2 className="w-5 h-5 text-brand-outlook shrink-0 mt-0.5" />
												<span>{bullet}</span>
											</li>
										))}
									</ul>
								</div>
								<div className="lg:col-span-5 md:col-span-12 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden">
									<div className="absolute top-0 right-0 p-2 bg-brand-outlook/20 text-brand-outlook rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
										Corporate Active
									</div>
									<h4 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest mb-4">
										Sample Setup
									</h4>
									<div className="space-y-4">
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-outlook">
												Meeting Conflict Resolution
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												If conflict exists, draft tentative accept email asking
												for recording, or suggest a 30m slide.
											</p>
										</div>
										<div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5">
											<p className="text-xs font-bold text-brand-outlook">
												Action Item Log
											</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Write key decisions from meeting invites to task
												timelines.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* How It Works Timeline Section */}
			<section id="how-it-works" className="py-20 md:py-28 relative">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-20">
						<h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
							Setup is Fast & Simple
						</h2>
						<p className="mt-4 text-slate-500 dark:text-slate-400">
							Get up and running in minutes. Connect your communication channels
							and let OmniSync automate the rest.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
						{/* Connecting lines for desktop */}
						<div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-transparent z-0" />

						{/* Step 1 */}
						<div className="flex flex-col items-center text-center relative z-10">
							<div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-6 font-display text-2xl font-black shadow-lg shadow-indigo-500/5 hover:scale-105 transition-transform duration-300">
								01
							</div>
							<h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
								Connect Accounts
							</h3>
							<p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
								Authorize OmniSync to connect with WhatsApp, Gmail, Telegram, or
								Outlook securely via OAuth or API tokens in a single click.
							</p>
						</div>

						{/* Step 2 */}
						<div className="flex flex-col items-center text-center relative z-10">
							<div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/10 flex items-center justify-center text-purple-500 dark:text-purple-400 mb-6 font-display text-2xl font-black shadow-lg shadow-purple-500/5 hover:scale-105 transition-transform duration-300">
								02
							</div>
							<h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
								Define AI Settings
							</h3>
							<p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
								Set priority rules, tone configurations, filters, digest
								schedules, and decide which keywords trigger automatic
								reminders.
							</p>
						</div>

						{/* Step 3 */}
						<div className="flex flex-col items-center text-center relative z-10">
							<div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/10 flex items-center justify-center text-cyan-500 dark:text-cyan-400 mb-6 font-display text-2xl font-black shadow-lg shadow-cyan-500/5 hover:scale-105 transition-transform duration-300">
								03
							</div>
							<h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
								Autonomous Sync
							</h3>
							<p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
								The agent processes items in the background, drafting answers,
								setting logs, and alerting you when high-importance matters
								arrive.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Accordion FAQ Section */}
			<section
				id="faq"
				className="py-20 md:py-28 border-t border-slate-200 dark:border-white/5 relative">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
							Frequently Asked Questions
						</h2>
						<p className="mt-4 text-slate-500 dark:text-slate-400">
							Have questions about security, integrations, or customization?
							Find quick details here.
						</p>
					</div>

					<div className="space-y-4">
						{faqs.map((faq, index) => {
							const isOpen = openFaq === index;
							return (
								<div
									key={index}
									className="glass-panel rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300">
									<button
										onClick={() => setOpenFaq(isOpen ? null : index)}
										className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-white/2 transition-colors duration-200 cursor-pointer">
										<span className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base pr-4">
											{faq.question}
										</span>
										<ChevronDown
											className={`w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-300 ${
												isOpen ? "rotate-180" : ""
											}`}
										/>
									</button>
									{isOpen && (
										<div className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400 leading-relaxed animate-in slide-in-from-top-2 duration-300">
											<div className="pt-2 border-t border-slate-200 dark:border-white/5">
												{faq.answer}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Action Banner / Newsletter Sign Up */}
			<section id="cta" className="py-16 md:py-24 relative overflow-hidden">
				{/* Banner Glow background */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full filter blur-[100px] pointer-events-none" />

				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="glass-panel rounded-3xl border border-slate-200 dark:border-white/10 p-8 sm:p-12 md:p-16 text-center space-y-6 shadow-2xl relative">
						<div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-3xl blur-md -z-10" />

						<div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase">
							<span>🚀 Try OmniSync Free</span>
						</div>

						<h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
							Ready to Connect Your Workspace?
						</h2>

						<p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
							Join thousands of developers, founders, and managers automating
							their communications. Get started today with no credit card
							required.
						</p>

						{/* Input field with Success simulation */}
						<div className="max-w-md mx-auto pt-4">
							{newsletterSuccess ?
								<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-sm font-semibold flex items-center justify-center space-x-2 animate-in zoom-in-95 duration-200">
									<Check className="w-5 h-5" />
									<span>Success! Access link sent to your email.</span>
								</div>
							:	<form
									onSubmit={handleNewsletterSubmit}
									className="flex flex-col sm:flex-row gap-3">
									<input
										type="email"
										required
										placeholder="Enter your email address"
										value={newsletterEmail}
										onChange={(e) => setNewsletterEmail(e.target.value)}
										className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm transition-all duration-200"
									/>
									<button
										type="submit"
										className="px-6 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center space-x-2 shrink-0 cursor-pointer">
										<span>Connect Now</span>
										<ArrowRight className="w-4 h-4" />
									</button>
								</form>
							}
							<p className="text-[10px] text-slate-500 mt-3">
								By clicking "Connect Now", you agree to our Terms of Service &
								Privacy Policy.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-black/60 border-t border-white/5 py-12 md:py-16 relative">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
						{/* Brand column */}
						<div className="col-span-2 space-y-4">
							<div className="flex items-center space-x-3">
								<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/10">
									<Sparkles className="w-4 h-4 text-white" />
								</div>
								<span className="font-display font-bold text-lg text-white">
									OmniSync<span className="text-indigo-400">.AI</span>
								</span>
							</div>
							<p className="text-xs text-slate-400 leading-relaxed max-w-sm">
								OmniSync is a personal assistant AI agent platform that connects
								seamlessly to your secure communication channels, automating
								summaries, replies, and schedules.
							</p>
							<div className="flex items-center space-x-4 pt-2">
								{/* Simulated Social Links */}
								<a
									href="#"
									className="p-2 rounded-lg bg-white/3 border border-white/5 text-slate-400 hover:text-white transition-colors duration-200">
									<span className="sr-only">Twitter</span>
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 24 24">
										<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
									</svg>
								</a>
								<a
									href="#"
									className="p-2 rounded-lg bg-white/3 border border-white/5 text-slate-400 hover:text-white transition-colors duration-200">
									<span className="sr-only">GitHub</span>
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 24 24">
										<path
											fillRule="evenodd"
											d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
											clipRule="evenodd"
										/>
									</svg>
								</a>
							</div>
						</div>

						{/* Product Links */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
								Product
							</h4>
							<ul className="space-y-2">
								<li>
									<a
										href="#simulator"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Play Demo
									</a>
								</li>
								<li>
									<a
										href="#features"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Features Blueprint
									</a>
								</li>
								<li>
									<a
										href="#integrations"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										App Ecosystem
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Pricing Models
									</a>
								</li>
							</ul>
						</div>

						{/* Integrations Links */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
								Integrations
							</h4>
							<ul className="space-y-2">
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										WhatsApp Sandbox
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Gmail OAuth
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Telegram Channels
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Microsoft Exchange
									</a>
								</li>
							</ul>
						</div>

						{/* Resources Links */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
								Resources
							</h4>
							<ul className="space-y-2">
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										API Guidelines
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Security Audits
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										System Logs
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Help Center
									</a>
								</li>
							</ul>
						</div>

						{/* Company Links */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
								Company
							</h4>
							<ul className="space-y-2">
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										About Us
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Contact Team
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Privacy Shield
									</a>
								</li>
								<li>
									<a
										href="#"
										className="text-xs text-slate-400 hover:text-white transition-colors duration-150">
										Legal Agreements
									</a>
								</li>
							</ul>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 text-xs text-slate-500">
						<p>
							© {new Date().getFullYear()} OmniSync AI Inc. All rights reserved.
						</p>
						<div className="flex items-center space-x-2 mt-4 sm:mt-0">
							<span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
							<span>All Systems Operational</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
