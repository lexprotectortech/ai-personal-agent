"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "../../../components/auth-provider";
import { insforge } from "../../lib/insforge";
import {
	Bell,
	Sliders,
	Shield,
	AlertTriangle,
	Clock,
	CheckCircle,
	Inbox,
	Sparkles,
	Plus,
	Loader2,
	Trash2,
	ExternalLink,
	ChevronRight,
	Send,
	Check,
	RefreshCw,
	X,
	MessageSquare,
	AlertCircle,
	Info,
} from "lucide-react";

interface AlertRule {
	id: string;
	user_id: string;
	name: string;
	description: string;
	selected_apps: string[];
	condition_rule: string;
	priority_level: "High" | "Medium" | "Low";
	notification_method: "In-App" | "Email" | "WhatsApp";
	frequency: "Real-time" | "Hourly" | "Daily";
	action_to_perform: string;
	is_active: boolean;
	created_at: string;
}

interface TriggeredAlert {
	id: string;
	user_id: string;
	rule_id: string | null;
	title: string;
	description: string;
	source_app: string;
	priority_level: "High" | "Medium" | "Low";
	status: "Active" | "Snoozed" | "Resolved";
	time: string;
	action_taken: string | null;
	ai_summary: string | null;
	ai_next_action: string | null;
	raw_content: string | null;
	snoozed_until: string | null;
}

interface SuggestedRule {
	name: string;
	description: string;
	selected_apps: string[];
	condition_rule: string;
	priority_level: "High" | "Medium" | "Low";
	notification_method: "In-App" | "Email" | "WhatsApp";
	frequency: "Real-time" | "Hourly" | "Daily";
	action_to_perform: string;
}

export default function AlertsPage() {
	const { user } = useAuth();

	// Real-time connection ref
	const realtimeRef = useRef<boolean>(false);

	// States
	const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
	const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
	const [aiSuggestions, setAiSuggestions] = useState<SuggestedRule[]>([]);

	const [loadingRules, setLoadingRules] = useState(true);
	const [loadingAlerts, setLoadingAlerts] = useState(true);
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);
	const [checkingAlerts, setCheckingAlerts] = useState(false);
	const [submittingRule, setSubmittingRule] = useState(false);

	// Dialog Modals
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	// Details Modal context
	const [selectedAlert, setSelectedAlert] = useState<TriggeredAlert | null>(
		null,
	);
	const [loadingSummary, setLoadingSummary] = useState(false);
	const [summaryData, setSummaryData] = useState<{
		summary: string;
		nextAction: string;
		draft: string;
	} | null>(null);
	const [replyDraft, setReplyDraft] = useState("");
	const [replyInstruction, setReplyInstruction] = useState("");
	const [sendingReply, setSendingReply] = useState(false);
	const [sendingReplySuccess, setSendingReplySuccess] = useState(false);
	const [replyError, setReplyError] = useState<string | null>(null);

	// Create Form States
	const [formName, setFormName] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formApps, setFormApps] = useState<string[]>([]);
	const [formCondition, setFormCondition] = useState("");
	const [formPriority, setFormPriority] = useState<"High" | "Medium" | "Low">(
		"Medium",
	);
	const [formNotification, setFormNotification] = useState<
		"In-App" | "Email" | "WhatsApp"
	>("In-App");
	const [formFrequency, setFormFrequency] = useState<
		"Real-time" | "Hourly" | "Daily"
	>("Real-time");
	const [formAction, setFormAction] = useState("");

	// Notification Toasts
	const [toastMessage, setToastMessage] = useState<{
		text: string;
		type: "success" | "info" | "warning";
	} | null>(null);

	// App platforms list helper
	const PLATFORM_LIST = [
		{ id: "gmail", name: "Gmail", logo: "/gmail.svg" },
		{ id: "whatsapp", name: "WhatsApp", logo: "/whatsapp.svg" },
		{ id: "telegram", name: "Telegram", logo: "/telegram.svg" },
		{ id: "outlook", name: "Outlook", logo: "/outlook.svg" },
		{ id: "slack", name: "Slack", logo: "/slack.svg" },
		{ id: "discord", name: "Discord", logo: "/discord.svg" },
	];

	const showToast = (
		text: string,
		type: "success" | "info" | "warning" = "success",
	) => {
		setToastMessage({ text, type });
		setTimeout(() => setToastMessage(null), 5000);
	};

	// 1. Fetch initial definitions and alert history
	const loadData = async () => {
		if (!user) return;
		try {
			setLoadingRules(true);
			setLoadingAlerts(true);

			// Load alert rules
			const { data: rules, error: rulesError } = await insforge.database
				.from("alert_rules")
				.select("*")
				.order("created_at", { ascending: false });

			if (rulesError) {
				console.error("Error fetching alert rules:", rulesError);
			} else {
				setAlertRules(rules || []);
			}

			// Load triggered alerts
			const { data: alerts, error: alertsError } = await insforge.database
				.from("triggered_alerts")
				.select("*")
				.order("time", { ascending: false });

			if (alertsError) {
				console.error("Error fetching triggered alerts:", alertsError);
			} else {
				setTriggeredAlerts(alerts || []);
			}
		} catch (e) {
			console.error("Failed to load alerts page data:", e);
		} finally {
			setLoadingRules(false);
			setLoadingAlerts(false);
		}
	};

	// 2. Fetch AI Suggested Alerts
	const loadSuggestions = async () => {
		if (!user) return;
		try {
			setLoadingSuggestions(true);
			const res = await fetch("/api/alerts/suggestions", {
				headers: { "x-user-id": user.id },
			});
			const data = await res.json();
			if (data.success) {
				setAiSuggestions(data.suggestions || []);
			}
		} catch (e) {
			console.error("Failed to load AI suggestions:", e);
		} finally {
			setLoadingSuggestions(false);
		}
	};

	// 3. Connect to Realtime Socket.IO channel
	useEffect(() => {
		if (!user) return;
		loadData();
		loadSuggestions();

		const setupRealtime = async () => {
			if (realtimeRef.current) return;
			try {
				console.log(`[Alerts UI] Connecting to realtime for alerts:${user.id}`);
				await insforge.realtime.connect();
				const subscribeRes = await insforge.realtime.subscribe(
					`alerts:${user.id}`,
				);

				if (subscribeRes.ok) {
					realtimeRef.current = true;
					console.log(`[Alerts UI] Subscribed to alerts:${user.id}`);

					// Listen to triggered alert updates
					insforge.realtime.on(
						"alert_triggered",
						(newAlert: TriggeredAlert) => {
							console.log("[Alerts UI] Real-time alert received:", newAlert);

							// Append to list if not already there
							setTriggeredAlerts((prev) => {
								if (prev.some((a) => a.id === newAlert.id)) return prev;
								return [newAlert, ...prev];
							});

							// Play notification sound
							try {
								const audio = new Audio(
									"https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav",
								);
								audio.volume = 0.3;
								audio.play();
							} catch (soundErr) {
								// Ignore sound errors due to browser policy
							}

							showToast(
								`New ${newAlert.priority_level} Priority Alert: ${newAlert.title}`,
								"warning",
							);
						},
					);
				}
			} catch (err) {
				console.error("Realtime subscription failed:", err);
			}
		};

		setupRealtime();

		return () => {
			if (realtimeRef.current) {
				console.log("[Alerts UI] Cleaning up Realtime connection");
				insforge.realtime.unsubscribe(`alerts:${user.id}`);
				insforge.realtime.disconnect();
				realtimeRef.current = false;
			}
		};
	}, [user]);

	// Handle manual check for alerts
	const handleCheckNow = async () => {
		if (!user) return;
		try {
			setCheckingAlerts(true);
			const res = await fetch("/api/alerts/check", {
				method: "POST",
				headers: { "x-user-id": user.id },
			});
			const data = await res.json();
			if (data.success) {
				showToast(
					`Alert Check Completed! Found ${data.triggeredCount} new alerts.`,
					"success",
				);
				loadData();
			} else {
				showToast(data.error || "Failed to check alerts", "warning");
			}
		} catch (e) {
			console.error("Alert check failed:", e);
			showToast("Alert check failed. Please try again.", "warning");
		} finally {
			setCheckingAlerts(false);
		}
	};

	// Handle custom rule submission
	const handleCreateRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		if (!formName || !formCondition) {
			showToast("Please fill in Alert Name and Trigger condition.", "warning");
			return;
		}

		try {
			setSubmittingRule(true);
			const newRule = {
				user_id: user.id,
				name: formName,
				description: formDesc,
				selected_apps: formApps,
				condition_rule: formCondition,
				priority_level: formPriority,
				notification_method: formNotification,
				frequency: formFrequency,
				action_to_perform: formAction,
				is_active: true,
			};

			const { data, error } = await insforge.database
				.from("alert_rules")
				.insert([newRule])
				.select();

			if (error) {
				showToast(error.message, "warning");
			} else {
				showToast(`Alert Rule "${formName}" created successfully!`, "success");
				setIsCreateOpen(false);
				// Clear fields
				setFormName("");
				setFormDesc("");
				setFormApps([]);
				setFormCondition("");
				setFormPriority("Medium");
				setFormNotification("In-App");
				setFormFrequency("Real-time");
				setFormAction("");

				loadData();
			}
		} catch (err: any) {
			console.error("Failed to create alert rule:", err);
			showToast("Error saving alert rule", "warning");
		} finally {
			setSubmittingRule(false);
		}
	};

	// Toggle Rule Status
	const handleToggleRuleStatus = async (
		ruleId: string,
		currentActive: boolean,
	) => {
		try {
			const { error } = await insforge.database
				.from("alert_rules")
				.update({ is_active: !currentActive })
				.eq("id", ruleId);

			if (error) {
				showToast("Failed to update status", "warning");
			} else {
				setAlertRules((prev) =>
					prev.map((r) =>
						r.id === ruleId ? { ...r, is_active: !currentActive } : r,
					),
				);
				showToast(`Rule ${!currentActive ? "Enabled" : "Disabled"}`, "success");
			}
		} catch (e) {
			console.error(e);
		}
	};

	// Delete Rule
	const handleDeleteRule = async (ruleId: string) => {
		if (!window.confirm("Are you sure you want to delete this alert rule?"))
			return;
		try {
			const { error } = await insforge.database
				.from("alert_rules")
				.delete()
				.eq("id", ruleId);

			if (error) {
				showToast("Failed to delete rule", "warning");
			} else {
				setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
				showToast("Alert rule deleted.", "success");
			}
		} catch (e) {
			console.error(e);
		}
	};

	// Open Details Modal & generate/load AI Summary + Actions
	const handleOpenDetails = async (alert: TriggeredAlert) => {
		setSelectedAlert(alert);
		setIsDetailsOpen(true);
		setLoadingSummary(true);
		setSummaryData(null);
		setReplyDraft("");
		setReplyInstruction("");
		setSendingReplySuccess(false);
		setReplyError(null);

		if (!user) return;

		try {
			const res = await fetch("/api/alerts/summary", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({ alertId: alert.id }),
			});
			const data = await res.json();
			if (data.success) {
				setSummaryData({
					summary: data.summary,
					nextAction: data.nextAction,
					draft: data.draft,
				});
				setReplyDraft(data.draft);
			}
		} catch (e) {
			console.error("Failed to generate alert details summary:", e);
		} finally {
			setLoadingSummary(false);
		}
	};

	// Snooze Alert
	const handleSnooze = async (alertId: string, minutes: number) => {
		const snoozedUntil = new Date(
			Date.now() + minutes * 60 * 1000,
		).toISOString();
		try {
			const { error } = await insforge.database
				.from("triggered_alerts")
				.update({ status: "Snoozed", snoozed_until: snoozedUntil })
				.eq("id", alertId);

			if (error) {
				showToast("Failed to snooze alert", "warning");
			} else {
				showToast(`Alert snoozed for ${minutes} minutes.`, "success");
				setTriggeredAlerts((prev) =>
					prev.map((a) =>
						a.id === alertId ?
							{ ...a, status: "Snoozed", snoozed_until: snoozedUntil }
						:	a,
					),
				);
				setIsDetailsOpen(false);
			}
		} catch (e) {
			console.error(e);
		}
	};

	// Mark Alert as Resolved
	const handleResolve = async (alertId: string) => {
		try {
			const { error } = await insforge.database
				.from("triggered_alerts")
				.update({ status: "Resolved" })
				.eq("id", alertId);

			if (error) {
				showToast("Failed to resolve alert", "warning");
			} else {
				showToast("Alert marked as resolved.", "success");
				setTriggeredAlerts((prev) =>
					prev.map((a) =>
						a.id === alertId ? { ...a, status: "Resolved" } : a,
					),
				);
				setIsDetailsOpen(false);
			}
		} catch (e) {
			console.error(e);
		}
	};

	// Regenerate Reply Draft using instruction
	const handleRegenerateReply = async () => {
		if (!user || !selectedAlert) return;
		try {
			setLoadingSummary(true);
			const res = await fetch("/api/ai/compose", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({
					sender:
						selectedAlert.title.split("]")[1]?.trim() ||
						selectedAlert.title ||
						"User",
					text: selectedAlert.raw_content || selectedAlert.description,
					source: selectedAlert.source_app,
					category: "messages",
					userInstruction: replyInstruction,
				}),
			});
			const data = await res.json();
			if (data.success) {
				setReplyDraft(data.draft);
				showToast("New reply draft generated.", "success");
			}
		} catch (e) {
			console.error(e);
			showToast("Failed to compose new draft.", "warning");
		} finally {
			setLoadingSummary(false);
		}
	};

	// Send Reply directly from the connected app
	const handleSendReply = async () => {
		if (!user || !selectedAlert || !replyDraft) return;
		try {
			setSendingReply(true);
			setReplyError(null);

			// Extract sender/recipient. For whatsapp we try to parse it, for emails we use sender address
			let recipient =
				selectedAlert.title.split("]")[1]?.split(" ")[0] || "mock-recipient";

			const res = await fetch("/api/message/send", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({
					recipient,
					messageText: replyDraft,
					source: selectedAlert.source_app,
				}),
			});

			const data = await res.json();
			if (data.success) {
				setSendingReplySuccess(true);
				showToast(
					`Reply sent successfully via ${selectedAlert.source_app}!`,
					"success",
				);
				// Mark alert as resolved automatically
				handleResolve(selectedAlert.id);
			} else {
				setReplyError(data.error || "Failed to dispatch message");
			}
		} catch (e: any) {
			console.error(e);
			setReplyError(e.message || "Network error occurred while sending");
		} finally {
			setSendingReply(false);
		}
	};

	// Adopt AI Suggestion
	const handleAdoptSuggestion = (suggestion: SuggestedRule) => {
		setFormName(suggestion.name);
		setFormDesc(suggestion.description);
		setFormApps(suggestion.selected_apps);
		setFormCondition(suggestion.condition_rule);
		setFormPriority(suggestion.priority_level);
		setFormNotification(suggestion.notification_method);
		setFormFrequency(suggestion.frequency);
		setFormAction(suggestion.action_to_perform);

		setIsCreateOpen(true);
	};

	// Calculate statistics
	const activeAlertRulesCount = alertRules.filter((r) => r.is_active).length;

	const today = new Date().toDateString();
	const triggeredTodayCount = triggeredAlerts.filter(
		(a) => new Date(a.time).toDateString() === today,
	).length;

	const highPriorityAlertsCount = triggeredAlerts.filter(
		(a) => a.priority_level === "High" && a.status !== "Resolved",
	).length;

	const resolvedAlertsCount = triggeredAlerts.filter(
		(a) => a.status === "Resolved",
	).length;

	return (
		<div className="space-y-8 max-w-6xl mx-auto">
			{/* Toast Alert banner */}
			{toastMessage && (
				<div
					className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-in slide-in-from-bottom duration-300 ${
						toastMessage.type === "success" ?
							"bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
						: toastMessage.type === "warning" ?
							"bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
						:	"bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
					}`}>
					{toastMessage.type === "warning" ?
						<AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
					:	<CheckCircle className="w-5 h-5 flex-shrink-0" />}
					<span className="text-xs font-semibold">{toastMessage.text}</span>
				</div>
			)}

			{/* Top Header Section */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white tracking-wide">
						Alert Center
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						Configure smart conditions and monitor updates across connected
						messaging & calendar feeds.
					</p>
				</div>
				<div className="flex items-center space-x-3 flex-wrap">
					<button
						onClick={handleCheckNow}
						disabled={checkingAlerts}
						className="h-10 inline-flex items-center space-x-2 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50">
						{checkingAlerts ?
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						:	<RefreshCw className="w-3.5 h-3.5" />}
						<span>
							{checkingAlerts ? "Checking Feeds..." : "Check Feeds Now"}
						</span>
					</button>

					<button
						onClick={() => setIsCreateOpen(true)}
						className="h-10 inline-flex items-center space-x-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/10">
						<Plus className="w-4 h-4" />
						<span>Create New Alert</span>
					</button>
				</div>
			</div>

			{/* Stats Cards Section */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Active Rules */}
				<div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl" />
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
							<Sliders className="w-4 h-4" />
						</div>
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Active Rules
						</span>
					</div>
					<p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-3">
						{activeAlertRulesCount}
					</p>
				</div>

				{/* Triggered Today */}
				<div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl" />
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
							<Bell className="w-4 h-4" />
						</div>
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Triggered Today
						</span>
					</div>
					<p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-3">
						{triggeredTodayCount}
					</p>
				</div>

				{/* High Priority Alerts */}
				<div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl" />
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
							<AlertTriangle className="w-4 h-4 animate-pulse" />
						</div>
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							High Priority
						</span>
					</div>
					<p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-3">
						{highPriorityAlertsCount}
					</p>
				</div>

				{/* Resolved Alerts */}
				<div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl" />
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<CheckCircle className="w-4 h-4" />
						</div>
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Resolved Alerts
						</span>
					</div>
					<p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-3">
						{resolvedAlertsCount}
					</p>
				</div>
			</div>

			{/* Main Content Layout (Timeline + AI Suggested side panel) */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column: Recent Alerts Timeline */}
				<div className="lg:col-span-2 space-y-6">
					<div className="glass-panel border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
						<div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
							<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
								<Clock className="w-4 h-4 text-indigo-500" />
								<span>Recent Alert Timeline</span>
							</h3>
							<span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
								{triggeredAlerts.length} Alerts Total
							</span>
						</div>

						{loadingAlerts ?
							<div className="py-20 flex flex-col items-center justify-center space-y-3">
								<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Loading alert feeds...
								</span>
							</div>
						: triggeredAlerts.length === 0 ?
							<div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
								<div className="w-12 h-12 rounded-full border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
									<Inbox className="w-6 h-6" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
										All Quiet
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										No rules have triggered recently. Set up a rule or check
										feeds now.
									</p>
								</div>
							</div>
						:	<div className="mt-6 relative pl-6 border-l border-slate-200 dark:border-white/5 space-y-8">
								{triggeredAlerts.map((alert) => {
									const logo =
										PLATFORM_LIST.find((p) => p.id === alert.source_app)
											?.logo || "/default-platform.svg";

									return (
										<div
											key={alert.id}
											onClick={() => handleOpenDetails(alert)}
											className="group relative cursor-pointer glass-panel-hover p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-950/10 transition-all flex items-start justify-between">
											{/* Timeline Dot Indicator */}
											<span
												className={`absolute -left-[31px] top-5 w-2 h-2 rounded-full border border-white dark:border-[#030014] ${
													alert.status === "Resolved" ? "bg-emerald-500"
													: alert.status === "Snoozed" ? "bg-amber-500"
													: alert.priority_level === "High" ? "bg-rose-500"
													: alert.priority_level === "Medium" ? "bg-purple-500"
													: "bg-blue-500"
												}`}
											/>

											<div className="flex items-start space-x-4">
												{/* Platform Logo */}
												<div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center p-2 flex-shrink-0">
													<Image
														src={logo}
														alt={alert.source_app}
														width={24}
														height={24}
														className="object-contain"
													/>
												</div>

												<div className="space-y-1 pr-4">
													<div className="flex items-center flex-wrap gap-2">
														<h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
															{alert.title}
														</h4>
														<span
															className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
																alert.priority_level === "High" ?
																	"bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
																: alert.priority_level === "Medium" ?
																	"bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400"
																:	"bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400"
															}`}>
															{alert.priority_level}
														</span>
														<span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
															{new Date(alert.time).toLocaleTimeString([], {
																hour: "2-digit",
																minute: "2-digit",
															})}
														</span>
													</div>
													<p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
														{alert.description}
													</p>
												</div>
											</div>

											<div className="flex items-center space-x-3">
												<span
													className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded hidden sm:inline ${
														alert.status === "Resolved" ?
															"bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
														: alert.status === "Snoozed" ?
															"bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
														:	"bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
													}`}>
													{alert.status}
												</span>
												<ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
											</div>
										</div>
									);
								})}
							</div>
						}
					</div>
				</div>

				{/* Right Column: AI Suggestions & Active Rules */}
				<div className="space-y-6">
					{/* AI Suggested Rules */}
					<div className="glass-panel border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm relative overflow-hidden">
						<div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full filter blur-xl" />

						<h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2 pb-4 border-b border-slate-200 dark:border-white/5">
							<Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
							<span>AI Suggested Alerts</span>
						</h3>

						{loadingSuggestions ?
							<div className="py-12 flex flex-col items-center justify-center space-y-2">
								<Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
								<span className="text-[10px] text-slate-500 dark:text-slate-400">
									Scanning activity logs...
								</span>
							</div>
						: aiSuggestions.length === 0 ?
							<div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
								Connect more accounts or refresh feeds to unlock automated
								suggestions.
							</div>
						:	<div className="mt-4 space-y-4">
								{aiSuggestions.map((sug, i) => (
									<div
										key={i}
										className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/10 space-y-3 relative group">
										<div>
											<h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
												<span>{sug.name}</span>
												<span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
													{sug.priority_level}
												</span>
											</h4>
											<p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
												{sug.description}
											</p>
										</div>

										<div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5">
											<div className="flex items-center space-x-1.5">
												{sug.selected_apps.map((app) => {
													const appLogo =
														PLATFORM_LIST.find((p) => p.id === app)?.logo ||
														"/default-platform.svg";
													return (
														<Image
															key={app}
															src={appLogo}
															alt={app}
															width={14}
															height={14}
															className="object-contain"
															title={app}
														/>
													);
												})}
											</div>

											<button
												onClick={() => handleAdoptSuggestion(sug)}
												className="text-[10px] px-2.5 py-1 bg-purple-600 dark:bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors cursor-pointer">
												Adopt Alert
											</button>
										</div>
									</div>
								))}
							</div>
						}
					</div>

					{/* Active Rules List */}
					<div className="glass-panel border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
						<h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2 pb-4 border-b border-slate-200 dark:border-white/5">
							<Sliders className="w-4 h-4 text-indigo-500" />
							<span>Configured Rules ({alertRules.length})</span>
						</h3>

						{loadingRules ?
							<div className="py-12 flex flex-col items-center justify-center space-y-2">
								<Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
								<span className="text-[10px] text-slate-500 dark:text-slate-400">
									Loading rules...
								</span>
							</div>
						: alertRules.length === 0 ?
							<div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
								No custom alert rules configured yet. Click "Create New Alert"
								to add one.
							</div>
						:	<div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pr-1">
								{alertRules.map((rule) => (
									<div
										key={rule.id}
										className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/5 space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
												{rule.name}
											</span>
											<div className="flex items-center space-x-2">
												<button
													onClick={() =>
														handleToggleRuleStatus(rule.id, rule.is_active)
													}
													className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded cursor-pointer transition-colors ${
														rule.is_active ?
															"bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
														:	"bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
													}`}>
													{rule.is_active ? "Active" : "Disabled"}
												</button>
												<button
													onClick={() => handleDeleteRule(rule.id)}
													className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
													title="Delete Rule">
													<Trash2 className="w-3 h-3" />
												</button>
											</div>
										</div>
										<p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
											{rule.description || "No description"}
										</p>
										<div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
											IF: {rule.condition_rule}
										</div>
									</div>
								))}
							</div>
						}
					</div>
				</div>
			</div>

			{/* CREATE ALERT DIALOG */}
			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white dark:bg-[#0b081e] border border-slate-200 dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
						{/* Close Button */}
						<button
							onClick={() => setIsCreateOpen(false)}
							className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
							<X className="w-4 h-4" />
						</button>

						{/* Header */}
						<div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex items-center space-x-3">
							<div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
								<Bell className="w-4 h-4 animate-bounce" />
							</div>
							<div>
								<h3 className="text-base font-bold text-slate-900 dark:text-white font-display tracking-wide">
									Create New Alert Rule
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Establish a trigger condition evaluated continuously across
									messages.
								</p>
							</div>
						</div>

						{/* Form Body */}
						<form
							onSubmit={handleCreateRule}
							className="p-6 overflow-y-auto space-y-4 flex-1">
							{/* Rule Name */}
							<div className="space-y-1">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
									Alert Rule Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Investor Pitch Flag"
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
								/>
							</div>

							{/* Description */}
							<div className="space-y-1">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
									Description
								</label>
								<input
									type="text"
									placeholder="e.g. Alerts me when message talks about investments or pitch files."
									value={formDesc}
									onChange={(e) => setFormDesc(e.target.value)}
									className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
								/>
							</div>

							{/* Selected Apps */}
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
									Monitor Selected Apps
								</label>
								<div className="grid grid-cols-3 gap-2">
									{PLATFORM_LIST.map((platform) => {
										const isChecked = formApps.includes(platform.id);
										return (
											<button
												type="button"
												key={platform.id}
												onClick={() => {
													if (isChecked) {
														setFormApps(
															formApps.filter((a) => a !== platform.id),
														);
													} else {
														setFormApps([...formApps, platform.id]);
													}
												}}
												className={`flex items-center space-x-2 px-3 py-2 border rounded-xl transition-all cursor-pointer ${
													isChecked ?
														"bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold"
													:	"bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10"
												}`}>
												<Image
													src={platform.logo}
													alt={platform.name}
													width={14}
													height={14}
													className="object-contain"
												/>
												<span className="text-xs">{platform.name}</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Trigger Condition Rule */}
							<div className="space-y-1">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
									Alert Trigger Condition
								</label>
								<textarea
									required
									rows={2}
									placeholder="e.g. Email or message contains keywords: term sheet, investor pitch, investment, financials"
									value={formCondition}
									onChange={(e) => setFormCondition(e.target.value)}
									className="w-full p-4 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all font-sans resize-none"
								/>
							</div>

							{/* Priority, Notification, Frequency Settings */}
							<div className="grid grid-cols-3 gap-3">
								{/* Priority */}
								<div className="space-y-1">
									<label className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
										Priority
									</label>
									<select
										value={formPriority}
										onChange={(e: any) => setFormPriority(e.target.value)}
										className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b081e] text-slate-800 dark:text-white outline-none">
										<option value="High">High</option>
										<option value="Medium">Medium</option>
										<option value="Low">Low</option>
									</select>
								</div>

								{/* Method */}
								<div className="space-y-1">
									<label className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
										Notify Via
									</label>
									<select
										value={formNotification}
										onChange={(e: any) => setFormNotification(e.target.value)}
										className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b081e] text-slate-800 dark:text-white outline-none">
										<option value="In-App">In-App</option>
										<option value="Email">Email</option>
										<option value="WhatsApp">WhatsApp</option>
									</select>
								</div>

								{/* Frequency */}
								<div className="space-y-1">
									<label className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
										Frequency
									</label>
									<select
										value={formFrequency}
										onChange={(e: any) => setFormFrequency(e.target.value)}
										className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b081e] text-slate-800 dark:text-white outline-none">
										<option value="Real-time">Real-time</option>
										<option value="Hourly">Hourly</option>
										<option value="Daily">Daily</option>
									</select>
								</div>
							</div>

							{/* Action to perform when triggered */}
							<div className="space-y-1">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
									Perform Action on Trigger
								</label>
								<input
									type="text"
									placeholder="e.g. Flag priority and draft a reply to schedule meeting"
									value={formAction}
									onChange={(e) => setFormAction(e.target.value)}
									className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
								/>
							</div>

							{/* Submit / Cancel Buttons */}
							<div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer">
									Cancel
								</button>
								<button
									type="submit"
									disabled={submittingRule}
									className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center space-x-2">
									{submittingRule && (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									)}
									<span>
										{submittingRule ? "Saving..." : "Save Alert Rule"}
									</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ALERT DETAILS DIALOG (WITH AI SUMMARY, NEXT ACTION, REPLY COMPOSER) */}
			{isDetailsOpen && selectedAlert && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white dark:bg-[#0b081e] border border-slate-200 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col">
						{/* Close Button */}
						<button
							onClick={() => setIsDetailsOpen(false)}
							className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
							<X className="w-4 h-4" />
						</button>

						{/* Header */}
						<div className="p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex items-center space-x-4">
							<div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center p-2 flex-shrink-0">
								<Image
									src={
										PLATFORM_LIST.find((p) => p.id === selectedAlert.source_app)
											?.logo || "/default-platform.svg"
									}
									alt={selectedAlert.source_app}
									width={28}
									height={28}
									className="object-contain"
								/>
							</div>
							<div className="space-y-0.5">
								<h3 className="text-base font-bold text-slate-900 dark:text-white font-display tracking-wide truncate max-w-[400px]">
									{selectedAlert.title}
								</h3>
								<div className="flex items-center space-x-2">
									<span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
										Source: {selectedAlert.source_app}
									</span>
									<span className="text-slate-300 dark:text-white/10">•</span>
									<span className="text-[10px] text-slate-500 dark:text-slate-400">
										{new Date(selectedAlert.time).toLocaleString()}
									</span>
								</div>
							</div>
						</div>

						{/* Modal Body */}
						<div className="p-6 overflow-y-auto space-y-6 flex-1">
							{/* Alert Content Card */}
							<div className="space-y-1.5">
								<h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
									Alert Trigger Content
								</h4>
								<div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-sans select-text whitespace-pre-wrap">
									{selectedAlert.raw_content || selectedAlert.description}
								</div>
							</div>

							{/* AI Features (Loader or Content) */}
							{loadingSummary ?
								<div className="py-12 border border-dashed border-slate-200 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-slate-950/10 flex flex-col items-center justify-center space-y-2">
									<Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
									<span className="text-xs text-slate-500 dark:text-slate-400">
										Synthesizing alert details and action plan...
									</span>
								</div>
							:	<div className="space-y-4">
									{/* AI Summary & Next Action Row */}
									{summaryData && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Summary */}
											<div className="p-4 rounded-xl border border-indigo-500/10 dark:border-indigo-500/10 bg-indigo-500/5 dark:bg-indigo-500/5 space-y-2">
												<h5 className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center">
													<Sparkles className="w-3.5 h-3.5 mr-1" />
													AI Summary
												</h5>
												<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
													{summaryData.summary}
												</p>
											</div>

											{/* Next Action */}
											<div className="p-4 rounded-xl border border-purple-500/10 dark:border-purple-500/10 bg-purple-500/5 dark:bg-purple-500/5 space-y-2">
												<h5 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center">
													<Sliders className="w-3.5 h-3.5 mr-1" />
													Suggested Next Action
												</h5>
												<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
													{summaryData.nextAction}
												</p>
											</div>
										</div>
									)}

									{/* AI Reply Composer Section */}
									{summaryData && (
										<div className="space-y-3 border-t border-slate-200 dark:border-white/5 pt-4">
											<h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
												<span>AI-Powered Reply Composer</span>
												<span className="text-[9px] lowercase font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
													Draft is editable
												</span>
											</h4>

											<textarea
												rows={4}
												value={replyDraft}
												onChange={(e) => setReplyDraft(e.target.value)}
												placeholder="AI response draft will appear here..."
												className="w-full p-4 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
											/>

											{/* Custom Prompt instruction field */}
											<div className="flex items-center space-x-2">
												<input
													type="text"
													placeholder="e.g. Tell Sarah I'm busy until 6 but can check the term sheet then."
													value={replyInstruction}
													onChange={(e) => setReplyInstruction(e.target.value)}
													className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white outline-none"
												/>
												<button
													onClick={handleRegenerateReply}
													className="h-9 px-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer">
													Rewrite Draft
												</button>
											</div>

											{/* Reply Error Banner */}
											{replyError && (
												<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
													<AlertCircle className="w-4 h-4 flex-shrink-0" />
													<span>{replyError}</span>
												</div>
											)}

											{/* Send Button */}
											<div className="flex items-center justify-between pt-1">
												<div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500">
													<Info className="w-3.5 h-3.5" />
													<span>
														Sends reply from connected app account JID/address
													</span>
												</div>
												<button
													onClick={handleSendReply}
													disabled={
														sendingReply || sendingReplySuccess || !replyDraft
													}
													className="h-9 px-4 inline-flex items-center space-x-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer">
													{sendingReply ?
														<Loader2 className="w-3.5 h-3.5 animate-spin" />
													: sendingReplySuccess ?
														<Check className="w-3.5 h-3.5 text-emerald-400" />
													:	<Send className="w-3.5 h-3.5" />}
													<span>
														{sendingReply ?
															"Sending Reply..."
														: sendingReplySuccess ?
															"Reply Dispatched!"
														:	"Send Reply Now"}
													</span>
												</button>
											</div>
										</div>
									)}
								</div>
							}
						</div>

						{/* Footer Options (Snooze, Resolve) */}
						<div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex flex-wrap gap-3 items-center justify-between">
							{/* Snooze Dropdown */}
							<div className="flex items-center space-x-2">
								<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
									Snooze:
								</span>
								<div className="flex items-center space-x-1">
									{[30, 60, 120].map((mins) => (
										<button
											key={mins}
											onClick={() => handleSnooze(selectedAlert.id, mins)}
											className="px-2.5 py-1.5 border border-slate-200 dark:border-white/5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 text-[10px] font-semibold transition-colors cursor-pointer">
											{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
										</button>
									))}
								</div>
							</div>

							{/* Action buttons */}
							<div className="flex items-center space-x-3">
								<button
									onClick={() => setIsDetailsOpen(false)}
									className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer">
									Dismiss
								</button>
								<button
									onClick={() => handleResolve(selectedAlert.id)}
									disabled={selectedAlert.status === "Resolved"}
									className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5">
									<CheckCircle className="w-3.5 h-3.5" />
									<span>
										{selectedAlert.status === "Resolved" ?
											"Resolved"
										:	"Resolve Alert"}
									</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
