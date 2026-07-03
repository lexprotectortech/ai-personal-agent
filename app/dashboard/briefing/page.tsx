"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth-provider";
import {
	FileText,
	Calendar,
	Sparkles,
	Clock,
	Check,
	Plus,
	RefreshCw,
	Mail,
	MessageSquare,
	AtSign,
	ListTodo,
	AlertCircle,
	Loader2,
	Trash2,
	Play,
	X,
	ChevronRight,
	ExternalLink,
} from "lucide-react";

interface BriefingSchedule {
	id: string;
	name: string;
	description: string;
	selected_apps: string[];
	selected_categories: string[];
	scheduled_time: string;
	frequency: string;
	priority_level: "High" | "Medium" | "Low";
	next_run_at: string;
}

interface BriefingRun {
	id: string;
	name: string;
	created_at: string;
	topBrief: {
		title: string;
		summary: string;
	};
	categories: Record<string, { count: number; summary: string }>;
}

export default function BriefingPage() {
	const { user } = useAuth();
	const router = useRouter();

	// State Lists
	const [schedules, setSchedules] = useState<BriefingSchedule[]>([]);
	const [runs, setRuns] = useState<BriefingRun[]>([]);
	const [latestDailyBrief, setLatestDailyBrief] = useState<any | null>(null);

	// Loaders
	const [loadingSchedules, setLoadingSchedules] = useState(true);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [syncingDaily, setSyncingDaily] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	// Dialog State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formName, setFormName] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formApps, setFormApps] = useState<string[]>(["whatsapp", "gmail"]);
	const [formCategories, setFormCategories] = useState<string[]>([
		"email",
		"messages",
		"tasks",
	]);
	const [formTime, setFormTime] = useState("09:00");
	const [formFrequency, setFormFrequency] = useState("daily");
	const [formPriority, setFormPriority] = useState("Medium");
	const [formError, setFormError] = useState<string | null>(null);

	// Fetch Schedules & History
	const fetchSchedules = async () => {
		if (!user) return;
		setLoadingSchedules(true);
		try {
			const res = await fetch("/api/briefing/schedule", {
				headers: { "x-user-id": user.id },
			});
			const data = await res.json();
			if (data.success) {
				setSchedules(data.schedules || []);
			}
		} catch (e) {
			console.error("Failed to load briefing schedules:", e);
		} finally {
			setLoadingSchedules(false);
		}
	};

	const fetchHistory = async () => {
		if (!user) return;
		setLoadingHistory(true);
		try {
			const res = await fetch("/api/briefing/generated", {
				headers: { "x-user-id": user.id },
			});
			const data = await res.json();
			if (data.success) {
				setRuns(data.history || []);
				// Pick the latest daily/general run as our featured brief
				const dailyBrief = data.history?.find(
					(r: BriefingRun) =>
						!r.categories === false || r.name.toLowerCase().includes("daily"),
				);
				if (dailyBrief) {
					setLatestDailyBrief(dailyBrief);
				}
			}
		} catch (e) {
			console.error("Failed to load briefing runs history:", e);
		} finally {
			setLoadingHistory(false);
		}
	};

	// Sync / Regenerate Main Briefing
	const syncDailyBriefing = async () => {
		if (!user) return;
		setSyncingDaily(true);
		try {
			// Direct call to regenerate daily dashboard summary
			const res = await fetch("/api/dashboard/brief?card=summary", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({ forceRefresh: true }),
			});
			const data = await res.json();
			if (data.success) {
				// Also trigger history refresh to include it
				await fetchHistory();
			}
		} catch (e) {
			console.error("Failed to sync channels daily brief:", e);
		} finally {
			setSyncingDaily(false);
		}
	};

	useEffect(() => {
		if (user) {
			fetchSchedules();
			fetchHistory();
		}
	}, [user]);

	// Handle Create Schedule Submit
	const handleCreateSchedule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setFormError(null);

		if (!formName.trim()) {
			setFormError("Please enter a briefing name.");
			return;
		}
		if (formApps.length === 0) {
			setFormError("Please select at least one connected app.");
			return;
		}
		if (formCategories.length === 0) {
			setFormError("Please select at least one category.");
			return;
		}

		setActionLoading("create");
		try {
			const timezone =
				Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
			const res = await fetch("/api/briefing/schedule", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({
					name: formName,
					description: formDescription,
					selectedApps: formApps,
					selectedCategories: formCategories,
					scheduledTime: formTime,
					frequency: formFrequency,
					priorityLevel: formPriority,
					timezone,
				}),
			});

			const data = await res.json();
			if (data.success) {
				setIsModalOpen(false);
				// Reset form
				setFormName("");
				setFormDescription("");
				setFormApps(["whatsapp", "gmail"]);
				setFormCategories(["email", "messages", "tasks"]);
				setFormTime("09:00");
				setFormFrequency("daily");
				setFormPriority("Medium");
				// Refresh schedules
				fetchSchedules();
			} else {
				setFormError(data.error || "Failed to save schedule.");
			}
		} catch (err: any) {
			setFormError(err.message || "Error occurred while saving.");
		} finally {
			setActionLoading(null);
		}
	};

	// Trigger Manual Run
	const handleRunManual = async (scheduleId: string) => {
		if (!user) return;
		setActionLoading(`run-${scheduleId}`);
		try {
			const res = await fetch("/api/briefing/trigger-manual", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({ scheduleId }),
			});
			const data = await res.json();
			if (data.success) {
				alert(
					"Briefing generation has been queued! Refresh in a few seconds to see the new run.",
				);
				fetchHistory();
			} else {
				alert(`Failed to queue run: ${data.error}`);
			}
		} catch (e) {
			console.error(e);
			alert("An error occurred while queueing.");
		} finally {
			setActionLoading(null);
		}
	};

	// Delete Schedule
	const handleDeleteSchedule = async (scheduleId: string) => {
		if (
			!user ||
			!confirm("Are you sure you want to delete this custom briefing schedule?")
		)
			return;
		setActionLoading(`delete-${scheduleId}`);
		try {
			const res = await fetch(`/api/briefing/schedule?id=${scheduleId}`, {
				method: "DELETE",
				headers: { "x-user-id": user.id },
			});
			const data = await res.json();
			if (data.success) {
				fetchSchedules();
			} else {
				alert(data.error || "Failed to delete schedule.");
			}
		} catch (e) {
			console.error(e);
		} finally {
			setActionLoading(null);
		}
	};

	// Toggle checklist helper
	const handleToggleApp = (app: string) => {
		setFormApps((prev) =>
			prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
		);
	};
	const handleToggleCategory = (cat: string) => {
		setFormCategories((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		);
	};

	// Render Helpers
	const getCategoryCountAndSummary = (categoryKey: string) => {
		if (latestDailyBrief?.categories?.[categoryKey]) {
			return latestDailyBrief.categories[categoryKey];
		}
		// Static Fallback
		switch (categoryKey) {
			case "email":
				return {
					count: 3,
					summary: "Sarah Jenkins requested dashboard layout changes",
				};
			case "messages":
				return {
					count: 4,
					summary: "Marketing Campaign proposals and devnet upgrades",
				};
			case "mentions":
				return {
					count: 1,
					summary: "Tagged in Dockerfile staging approval issue",
				};
			case "tasks":
				return {
					count: 2,
					summary: "Finalize contracts and resolve calendar conflict",
				};
			case "followups":
				return {
					count: 1,
					summary: "Daniel requested review on layout design feedback",
				};
			default:
				return { count: 0, summary: "No updates" };
		}
	};

	const getSourceIcon = (source: string) => {
		switch (source) {
			case "gmail":
				return <Mail className="w-3.5 h-3.5" />;
			case "telegram":
				return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
			case "outlook":
				return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
			default:
				return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
		}
	};

	return (
		<div className="space-y-8 max-w-6xl mx-auto px-4 md:px-0">
			{/* Header Banner */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-white/5 pb-6">
				<div className="space-y-1">
					<div className="flex items-center space-x-2 text-amber-500 font-semibold uppercase text-xs tracking-wider">
						<Sparkles className="w-3.5 h-3.5 mr-1" />
						AI Synced Digests
					</div>
					<h2 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
						Daily Intelligence Briefings
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
						View executive summaries from all linked communication accounts.
						Schedule background briefings or run them on demand.
					</p>
				</div>

				<div className="flex items-center space-x-3">
					<button
						onClick={syncDailyBriefing}
						disabled={syncingDaily}
						className="h-11 px-4 text-xs md:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white inline-flex items-center justify-center transition-colors cursor-pointer">
						{syncingDaily ?
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						:	<RefreshCw className="w-4 h-4 mr-2" />}
						Sync Channels
					</button>

					<button
						onClick={() => setIsModalOpen(true)}
						className="h-11 px-5 text-xs md:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-indigo-500/20">
						<Plus className="w-4 h-4 mr-2" />
						Create Custom Briefing
					</button>
				</div>
			</div>

			{/* Featured Highlight Card */}
			<div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/0 border border-indigo-500/20 dark:border-indigo-500/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm dark:shadow-none backdrop-blur-md">
				<div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full filter blur-[80px] pointer-events-none -z-10" />
				<div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
					<div className="space-y-4">
						<span className="inline-flex items-center px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
							<Calendar className="w-3 h-3 mr-1.5" />
							Featured Top Briefing
						</span>
						<div className="space-y-2">
							<h3 className="text-2xl font-bold font-display text-slate-950 dark:text-white">
								{latestDailyBrief?.topBrief?.title ||
									"Sarah Jenkins requested dashboard adjustments"}
							</h3>
							<p className="text-slate-600 dark:text-slate-350 text-sm md:text-base max-w-3xl leading-relaxed">
								{latestDailyBrief?.topBrief?.summary ||
									"Sarah requested card layout updates to support HSL theme colors. WhatsApp and Telegram messages indicate a marketing campaign draft is due and devnet upgrade is scheduled."}
							</p>
						</div>
						<div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
							<Clock className="w-3.5 h-3.5 mr-1" />
							Updated{" "}
							{latestDailyBrief?.created_at ?
								new Date(latestDailyBrief.created_at).toLocaleTimeString()
							:	"Just now"}
						</div>
					</div>
					<button
						onClick={() =>
							router.push(
								`/dashboard/briefing/details?id=${latestDailyBrief?.id || "daily"}`,
							)
						}
						className="self-start md:self-center h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors inline-flex items-center shrink-0 cursor-pointer shadow-md">
						Review Details
						<ChevronRight className="w-4 h-4 ml-1.5" />
					</button>
				</div>
			</div>

			{/* Category Grid Section */}
			<div className="space-y-4">
				<h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
					Grouped Updates
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[
						{
							key: "email",
							name: "Email Inbox",
							desc: "Mail notifications",
							icon: Mail,
							borderHover: "hover:border-red-500/30 bg-red-500/5 text-red-500",
						},
						{
							key: "messages",
							name: "Messages & Chats",
							desc: "WhatsApp & Telegram",
							icon: MessageSquare,
							borderHover:
								"hover:border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
						},
						{
							key: "mentions",
							name: "Mentions",
							desc: "Github & Dev forums",
							icon: AtSign,
							borderHover:
								"hover:border-blue-500/30 bg-blue-500/5 text-blue-500",
						},
						{
							key: "tasks",
							name: "Action Tasks",
							desc: "Calendar & Project logs",
							icon: ListTodo,
							borderHover:
								"hover:border-indigo-500/30 bg-indigo-500/5 text-indigo-500",
						},
						{
							key: "followups",
							name: "Follow-ups Pending",
							desc: "Outstanding replies",
							icon: Clock,
							borderHover:
								"hover:border-amber-500/30 bg-amber-500/5 text-amber-500",
						},
					].map((cat) => {
						const data = getCategoryCountAndSummary(cat.key);
						const Icon = cat.icon;
						return (
							<div
								key={cat.key}
								onClick={() =>
									router.push(
										`/dashboard/briefing/details?id=${latestDailyBrief?.id || "daily"}&category=${cat.key}`,
									)
								}
								className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-sm dark:shadow-none group ${cat.borderHover}`}>
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center space-x-3">
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center border border-current bg-transparent`}>
											<Icon className="w-5 h-5" />
										</div>
										<div>
											<span className="text-sm font-bold text-slate-800 dark:text-white block">
												{cat.name}
											</span>
											<span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block">
												{cat.desc}
											</span>
										</div>
									</div>
									<span className="text-2xl font-black text-slate-900 dark:text-white">
										{data.count}
									</span>
								</div>
								<p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed font-medium">
									{data.summary}
								</p>
								<div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-450 font-bold uppercase tracking-wider">
									<span>Explore Items</span>
									<ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Main Grid: Custom Schedules & History Runs */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Custom Schedules List */}
				<div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
					<div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-4">
						<h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
							Custom briefing Schedules
						</h3>
						<span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
							{schedules.length} Active Rules
						</span>
					</div>

					{loadingSchedules ?
						<div className="flex flex-col items-center justify-center py-12 space-y-3">
							<Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
							<span className="text-xs text-slate-400">
								Loading schedules...
							</span>
						</div>
					: schedules.length === 0 ?
						<div className="text-center py-12 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
							<FileText className="w-8 h-8 mb-2 text-slate-400" />
							<p className="text-sm">No custom briefings configured.</p>
							<button
								onClick={() => setIsModalOpen(true)}
								className="mt-3 text-xs font-semibold text-indigo-500 hover:underline">
								Create One Now
							</button>
						</div>
					:	<div className="space-y-4">
							{schedules.map((sched) => (
								<div
									key={sched.id}
									className="p-4 border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/10 rounded-xl space-y-3 hover:border-slate-350 dark:hover:border-white/10 transition-colors">
									<div className="flex items-start justify-between">
										<div>
											<h4 className="text-sm font-bold text-slate-800 dark:text-white">
												{sched.name}
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
												{sched.description || "No description provided."}
											</p>
										</div>
										<span
											className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
												sched.priority_level === "High" ?
													"bg-rose-500/10 border-rose-500/20 text-rose-500"
												: sched.priority_level === "Medium" ?
													"bg-amber-500/10 border-amber-500/20 text-amber-500"
												:	"bg-sky-500/10 border-sky-500/20 text-sky-500"
											}`}>
											{sched.priority_level}
										</span>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										{sched.selected_apps?.map((app) => (
											<span
												key={app}
												className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-350">
												{getSourceIcon(app)}
												<span className="capitalize">{app}</span>
											</span>
										))}
									</div>

									<div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
										<span className="flex items-center font-medium">
											<Clock className="w-3.5 h-3.5 mr-1" />
											{sched.frequency} at {sched.scheduled_time}
										</span>

										<div className="flex items-center space-x-2">
											<button
												onClick={() => handleRunManual(sched.id)}
												disabled={actionLoading === `run-${sched.id}`}
												className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
												title="Run schedule immediately">
												{actionLoading === `run-${sched.id}` ?
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												:	<Play className="w-3.5 h-3.5 fill-current" />}
											</button>

											<button
												onClick={() => handleDeleteSchedule(sched.id)}
												disabled={actionLoading === `delete-${sched.id}`}
												className="p-1.5 hover:bg-rose-500/10 dark:hover:bg-rose-500/5 rounded-lg text-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
												title="Delete schedule">
												{actionLoading === `delete-${sched.id}` ?
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												:	<Trash2 className="w-3.5 h-3.5" />}
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					}
				</div>

				{/* History Runs Log */}
				<div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
					<div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-4">
						<h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
							Recent Briefing Runs
						</h3>
						<span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
							{runs.length} Runs
						</span>
					</div>

					{loadingHistory ?
						<div className="flex flex-col items-center justify-center py-12 space-y-3">
							<Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
							<span className="text-xs text-slate-400">
								Loading history logs...
							</span>
						</div>
					: runs.length === 0 ?
						<div className="text-center py-12 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
							<FileText className="w-8 h-8 mb-2 text-slate-400" />
							<p className="text-sm">No briefings generated yet.</p>
							<button
								onClick={syncDailyBriefing}
								className="mt-3 text-xs font-semibold text-indigo-500 hover:underline">
								Trigger First Sync
							</button>
						</div>
					:	<div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
							{runs.map((run) => (
								<div
									key={run.id}
									onClick={() =>
										router.push(`/dashboard/briefing/details?id=${run.id}`)
									}
									className="p-4 border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all flex items-start justify-between group">
									<div className="space-y-2 min-w-0 pr-4">
										<div className="flex items-center space-x-2 flex-wrap gap-y-1">
											<span className="text-xs font-bold text-slate-800 dark:text-white capitalize truncate">
												{run.name}
											</span>
											<span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
												{new Date(run.created_at).toLocaleString([], {
													dateStyle: "short",
													timeStyle: "short",
												})}
											</span>
										</div>
										<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
											{run.topBrief?.summary ||
												"Briefing analysis completed successfully."}
										</p>
									</div>
									<ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all self-center shrink-0" />
								</div>
							))}
						</div>
					}
				</div>
			</div>

			{/* CREATE BRIEFING DIALOG MODAL */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					{/* Backdrop blur */}
					<div
						className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm"
						onClick={() => setIsModalOpen(false)}
					/>

					{/* Modal Content */}
					<div className="bg-white dark:bg-[#0c0a21] border border-slate-250 dark:border-white/10 rounded-3xl w-full max-w-lg p-6 relative z-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
							<h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
								Configure Custom Briefing
							</h3>
							<button
								onClick={() => setIsModalOpen(false)}
								className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-slate-400">
								<X className="w-5 h-5" />
							</button>
						</div>

						{formError && (
							<div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-500 rounded-xl text-xs flex items-start space-x-2 font-semibold">
								<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
								<span>{formError}</span>
							</div>
						)}

						<form onSubmit={handleCreateSchedule} className="space-y-4">
							{/* Name */}
							<div className="space-y-1">
								<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
									Briefing Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Marketing & Dev Sync"
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
								/>
							</div>

							{/* Goal Description */}
							<div className="space-y-1">
								<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
									Description or Goal
								</label>
								<textarea
									placeholder="e.g. Summarize urgent client requests and tech bugs"
									value={formDescription}
									onChange={(e) => setFormDescription(e.target.value)}
									className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
								/>
							</div>

							{/* Selected Apps */}
							<div className="space-y-2">
								<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
									Selected Apps
								</label>
								<div className="grid grid-cols-2 gap-2">
									{[
										{ id: "whatsapp", name: "WhatsApp" },
										{ id: "gmail", name: "Gmail" },
										{ id: "telegram", name: "Telegram" },
										{ id: "outlook", name: "Outlook" },
									].map((app) => {
										const isSelected = formApps.includes(app.id);
										return (
											<button
												type="button"
												key={app.id}
												onClick={() => handleToggleApp(app.id)}
												className={`p-2.5 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
													isSelected ?
														"bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
													:	"bg-slate-50/50 dark:bg-white/5 border-slate-250 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
												}`}>
												<span>{app.name}</span>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</button>
										);
									})}
								</div>
							</div>

							{/* Selected Categories */}
							<div className="space-y-2">
								<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
									Selected Categories
								</label>
								<div className="grid grid-cols-2 gap-2">
									{[
										{ id: "email", name: "Email" },
										{ id: "messages", name: "Messages" },
										{ id: "mentions", name: "Mentions" },
										{ id: "tasks", name: "Tasks" },
										{ id: "followups", name: "Follow-ups" },
									].map((cat) => {
										const isSelected = formCategories.includes(cat.id);
										return (
											<button
												type="button"
												key={cat.id}
												onClick={() => handleToggleCategory(cat.id)}
												className={`p-2.5 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
													isSelected ?
														"bg-purple-600/10 border-purple-500 text-purple-600 dark:text-purple-400"
													:	"bg-slate-50/50 dark:bg-white/5 border-slate-250 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
												}`}>
												<span>{schedMapping[cat.id] || cat.name}</span>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</button>
										);
									})}
								</div>
							</div>

							{/* Interval & Time */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
										Scheduled Time
									</label>
									<input
										type="time"
										required
										value={formTime}
										onChange={(e) => setFormTime(e.target.value)}
										className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-800 dark:text-white"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
										Frequency
									</label>
									<select
										value={formFrequency}
										onChange={(e) => setFormFrequency(e.target.value)}
										className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-800 dark:text-white">
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
									</select>
								</div>
							</div>

							{/* Priority */}
							<div className="space-y-1">
								<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
									Priority Level
								</label>
								<select
									value={formPriority}
									onChange={(e) => setFormPriority(e.target.value)}
									className="w-full bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-slate-800 dark:text-white">
									<option value="High">High (Immediate)</option>
									<option value="Medium">Medium (Regular)</option>
									<option value="Low">Low (Informative)</option>
								</select>
							</div>

							{/* Action Buttons */}
							<div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-white/5">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-250 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
									Cancel
								</button>
								<button
									type="submit"
									disabled={actionLoading === "create"}
									className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center">
									{actionLoading === "create" && (
										<Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
									)}
									Save Schedule
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

// Category Mapping helper for schedule names
const schedMapping: Record<string, string> = {
	email: "Email",
	messages: "Messages",
	mentions: "Mentions",
	tasks: "Tasks",
	followups: "Follow-ups",
};
