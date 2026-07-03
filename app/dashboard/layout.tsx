"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/auth-provider";
import {
	LayoutDashboard,
	Bot,
	FileText,
	Link as LinkIcon,
	Bell,
	Settings,
	CreditCard,
	ChevronLeft,
	ChevronRight,
	Sparkles,
	Loader2,
	LogOut,
	Sun,
	Moon,
	ArrowLeft,
	Mic,
	ArrowUp,
} from "lucide-react";

interface SidebarItem {
	name: string;
	href: string;
	icon: React.ComponentType<any>;
	bgColor: string;
	iconColor: string;
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, loading, signOut } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [theme, setTheme] = useState<"light" | "dark">("dark");

	// Initialize theme from document classList or localStorage
	useEffect(() => {
		const isDark = document.documentElement.classList.contains("dark");
		setTheme(isDark ? "dark" : "light");
	}, []);

	const toggleTheme = () => {
		const nextTheme = theme === "dark" ? "light" : "dark";
		setTheme(nextTheme);
		localStorage.setItem("theme", nextTheme);
		if (nextTheme === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.style.colorScheme = "light";
		}
	};

	// Auth Guard
	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen bg-[#030014] flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
			</div>
		);
	}

	if (!user) return null;

	interface NavigationItem {
		name: string;
		href: string;
		icon: React.ComponentType<any>;
	}

	interface NavigationCategory {
		title: string;
		items: NavigationItem[];
	}

	const navigationCategories: NavigationCategory[] = [
		{
			title: "Main",
			items: [
				{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
				{ name: "AI Agent", href: "/dashboard/ai-agent", icon: Bot },
			],
		},
		{
			title: "Tools",
			items: [
				{ name: "Briefing", href: "/dashboard/briefing", icon: FileText },
				{
					name: "Integrations",
					href: "/dashboard/integrations",
					icon: LinkIcon,
				},
				{ name: "Alerts", href: "/dashboard/alerts", icon: Bell },
			],
		},
		{
			title: "Account",
			items: [
				{ name: "Settings", href: "/dashboard/settings", icon: Settings },
				{
					name: "Pricing Settings",
					href: "/dashboard/pricing",
					icon: CreditCard,
				},
			],
		},
	];

	const getActiveItemName = () => {
		for (const cat of navigationCategories) {
			const found = cat.items.find((item) => item.href === pathname);
			if (found) return found.name;
		}
		return "Overview";
	};

	const renderNavItem = (item: NavigationItem) => {
		const isActive = pathname === item.href;
		const Icon = item.icon;

		return (
			<Link
				key={item.href}
				href={item.href}
				className={`flex items-center space-x-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
					isActive ?
						"bg-indigo-50/50 dark:bg-white/[0.06] text-indigo-600 dark:text-white font-medium shadow-sm"
					:	"text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50/30 dark:hover:bg-white/[0.03]"
				}`}>
				<Icon className="w-5 h-5 flex-shrink-0" />
				{!isCollapsed && (
					<span className="text-sm font-semibold tracking-wide">
						{item.name}
					</span>
				)}
			</Link>
		);
	};

	return (
		<div className="flex h-screen bg-slate-50 dark:bg-[#09080e] text-slate-900 dark:text-[#f8fafc] overflow-hidden relative">
			{/* Sidebar background blurs */}
			<div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 filter blur-[80px] pointer-events-none -z-10" />
			<div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-purple-500/5 filter blur-[80px] pointer-events-none -z-10" />

			{/* Sidebar */}
			<aside
				className={`flex flex-col border-r border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#0b0a10] h-full transition-all duration-300 ease-in-out ${
					isCollapsed ? "w-20" : "w-64"
				}`}>
				{/* Sidebar Header */}
				<div className="h-20 flex items-center px-4 border-b border-slate-200 dark:border-white/5 justify-between">
					<Link
						href="/"
						className="flex items-center space-x-3 group overflow-hidden">
						<div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
							<Sparkles className="w-5 h-5 text-white animate-pulse" />
							<div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
						</div>
						{!isCollapsed && (
							<span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent transition-opacity duration-300">
								OmniSync
								<span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
									.AI
								</span>
							</span>
						)}
					</Link>
				</div>

				{/* Navigation Options */}
				<nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
					{navigationCategories.map((category, catIdx) => (
						<div key={category.title} className="space-y-1.5">
							{!isCollapsed && (
								<span className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider px-3 block">
									{category.title}
								</span>
							)}
							<div className="space-y-1">
								{category.items.map(renderNavItem)}
							</div>
							{catIdx < navigationCategories.length - 1 && (
								<div className="border-t border-slate-200 dark:border-white/5 my-4 mx-3" />
							)}
						</div>
					))}
				</nav>

				{/* Sidebar Footer */}
				<div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-2">
					{/* Sign Out & Collapse Controls */}
					<div className="flex flex-col space-y-1">
						<button
							onClick={() => signOut()}
							className="flex items-center space-x-3.5 w-full px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 transition-all duration-200 cursor-pointer">
							<LogOut className="w-5 h-5 flex-shrink-0" />
							{!isCollapsed && (
								<span className="text-sm font-semibold tracking-wide">
									Sign Out
								</span>
							)}
						</button>

						<button
							onClick={() => setIsCollapsed(!isCollapsed)}
							className="flex items-center justify-center w-full py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 mt-2 cursor-pointer"
							aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
							{isCollapsed ?
								<ChevronRight className="w-5 h-5" />
							:	<ChevronLeft className="w-5 h-5" />}
						</button>
					</div>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col h-full overflow-hidden">
				{/* Top Header bar */}
				<header className="h-20 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-8 bg-white/40 dark:bg-[#0b0a10] backdrop-blur-md z-10">
					<div className="flex items-center">
						<h1 className="text-sm md:text-base font-bold font-display text-slate-850 dark:text-white tracking-wide">
							{pathname === "/dashboard" ?
								<>
									<span className="text-slate-400 dark:text-slate-400 font-medium">
										Dashboard
									</span>
									<span className="mx-2 text-slate-450 dark:text-slate-500 font-normal">
										&gt;
									</span>
									<span>Overview</span>
								</>
							:	<>
									<span className="text-slate-400 dark:text-slate-400 font-medium">
										Dashboard
									</span>
									<span className="mx-2 text-slate-450 dark:text-slate-500 font-normal">
										&gt;
									</span>
									<span>{getActiveItemName()}</span>
								</>
							}
						</h1>
					</div>

					<div className="flex items-center space-x-4">
						{/* Theme Toggle */}
						<button
							onClick={toggleTheme}
							className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer shadow-sm dark:shadow-none"
							aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
							title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
							{theme === "dark" ?
								<Sun className="w-5 h-5 text-amber-400" />
							:	<Moon className="w-5 h-5 text-indigo-600" />}
						</button>

						{/* Circular Avatar */}
						<div
							className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-650 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer border border-indigo-200 dark:border-white/10 hover:scale-105 transition-transform"
							title={user.email}>
							{user.email ? user.email[0].toUpperCase() : "U"}
						</div>
					</div>
				</header>

				{/* Content Viewport */}
				<main className="flex-1 overflow-y-auto p-8 relative">
					<div className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full bg-purple-500/5 filter blur-[100px] pointer-events-none -z-10" />
					{children}
				</main>

				{/* ─── Bottom AI Chat Bar (sticky) ─── */}
				<div
					className={`fixed bottom-0 transition-all duration-300 z-30 pointer-events-none`}
					style={{
						left: isCollapsed ? "80px" : "256px",
						right: "0",
					}}>
					<div className="max-w-6xl mx-auto px-8 pb-5 pointer-events-auto">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const input = (e.target as HTMLFormElement).elements.namedItem(
									"bottomChat",
								) as HTMLInputElement;
								if (input?.value.trim()) {
									router.push(
										`/dashboard/ai-agent?q=${encodeURIComponent(input.value.trim())}`,
									);
								}
							}}
							className="flex items-center h-[52px] rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-2xl backdrop-blur-xl px-4 gap-3">
							<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
								<Sparkles className="w-4 h-4 text-white" />
							</div>
							<input
								name="bottomChat"
								type="text"
								placeholder="How can I help you today?"
								className="flex-1 h-full bg-transparent text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none font-medium"
							/>
							<div className="flex items-center space-x-2 flex-shrink-0">
								<button
									type="button"
									className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 transition-colors cursor-pointer">
									<Mic className="w-4 h-4" />
								</button>
								<button
									type="submit"
									className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:from-indigo-600 hover:to-purple-700 transition-all cursor-pointer shadow-sm">
									<ArrowUp className="w-4 h-4" />
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
