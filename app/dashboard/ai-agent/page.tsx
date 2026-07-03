"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../components/auth-provider";
import { insforge } from "../../lib/insforge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Bot,
	Sparkles,
	Send,
	Loader2,
	Trash2,
	Mail,
	MessageSquare,
	FileText,
	Star,
	ExternalLink,
} from "lucide-react";

interface Message {
	role: "user" | "assistant";
	content: string;
}

export default function AIAgentPage() {
	const { user } = useAuth();
	const userName = user?.profile?.name || user?.email?.split("@")[0] || "User";

	// Chat conversation states
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [isThinking, setIsThinking] = useState(false);
	const [sessionTimestamp, setSessionTimestamp] = useState<number | null>(null);

	// Connected integrations tracker
	const [connectedPlatforms, setConnectedPlatforms] = useState<
		Record<string, boolean>
	>({
		whatsapp: false,
		gmail: false,
		telegram: false,
		outlook: false,
	});

	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Platform Logo Helper
	const getPlatformLogo = (source: string) => {
		switch (source.toLowerCase()) {
			case "gmail":
				return "/gmail.svg";
			case "whatsapp":
				return "/whatsapp.svg";
			case "slack":
				return "/slack.svg";
			case "outlook":
				return "/outlook.svg";
			case "discord":
				return "/discord.svg";
			case "linkedin":
				return "/linkedin.svg";
			case "telegram":
				return "/telegram.svg";
			default:
				return "/default-platform.svg";
		}
	};

	// Helper to scroll to bottom of chat list
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isThinking]);

	// Load connected platforms on mount
	useEffect(() => {
		if (!user) return;

		const loadPlatformStates = async () => {
			try {
				const { data } = await insforge.database
					.from("user_integrations")
					.select("platform_id, is_connected");

				const dbStatuses: Record<string, boolean> = {
					whatsapp: false,
					gmail: false,
					telegram: false,
					outlook: false,
				};

				if (data) {
					data.forEach((row: any) => {
						dbStatuses[row.platform_id] = !!row.is_connected;
					});
				}

				// Check WhatsApp live status as fallback/addition
				try {
					const res = await fetch("/api/whatsapp/status", {
						headers: { "x-user-id": user.id },
					});
					const wsData = await res.json();
					if (wsData.status === "connected") {
						dbStatuses.whatsapp = true;
					}
				} catch (wsErr) {
					console.error("Failed to pull WhatsApp connection status:", wsErr);
				}

				setConnectedPlatforms(dbStatuses);
			} catch (err) {
				console.error("Failed to load dashboard platforms:", err);
			}
		};

		loadPlatformStates();
	}, [user]);

	// Load chat session from LocalStorage with 1-day expiry check
	useEffect(() => {
		if (!user) return;

		const key = `omnisync_chat_history_${user.id}`;
		const stored = localStorage.getItem(key);

		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				const timestamp = parsed.timestamp || Date.now();
				const oneDay = 24 * 60 * 60 * 1000;

				if (Date.now() - timestamp > oneDay) {
					startNewConversation(true);
				} else {
					setMessages(parsed.messages || []);
					setSessionTimestamp(timestamp);
				}
			} catch (err) {
				console.error("Failed to parse chat history:", err);
				startNewConversation(true);
			}
		} else {
			startNewConversation(true);
		}
	}, [user]);

	// Start new conversation session
	const startNewConversation = (isInitial = false) => {
		const welcomeMessage: Message = {
			role: "assistant",
			content: `Hello! I am your OmniSync cognitive personal assistant. I monitor your connected Gmail, WhatsApp, and Telegram in real-time. Ask me to draft email replies, fetch summaries, or list your action items.
      
Ref: Gmail WhatsApp Telegram`,
		};

		setMessages([welcomeMessage]);

		if (user) {
			const key = `omnisync_chat_history_${user.id}`;
			const sessionData = {
				timestamp: Date.now(),
				messages: [welcomeMessage],
			};
			localStorage.setItem(key, JSON.stringify(sessionData));
			setSessionTimestamp(sessionData.timestamp);
		}
	};

	// Save conversation state to LocalStorage
	const saveChatHistory = (updatedMessages: Message[]) => {
		if (!user) return;
		const key = `omnisync_chat_history_${user.id}`;
		const ts = sessionTimestamp || Date.now();
		const sessionData = {
			timestamp: ts,
			messages: updatedMessages,
		};
		localStorage.setItem(key, JSON.stringify(sessionData));
	};

	// Send message function
	const handleSendMessage = async (textToSend?: string) => {
		const content = (textToSend || inputMessage).trim();
		if (!content || !user || isThinking) return;

		// Clear input
		if (!textToSend) setInputMessage("");

		// Append user message
		const userMessage: Message = { role: "user", content };
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);
		saveChatHistory(updatedMessages);

		setIsThinking(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": user.id,
				},
				body: JSON.stringify({ messages: updatedMessages }),
			});

			if (!response.ok) {
				throw new Error("Failed to retrieve response from AI Agent.");
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			if (!reader) {
				throw new Error("Response stream not readable.");
			}

			// Hide loading bubble and prepare streaming bubble
			setIsThinking(false);
			setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

			let streamedText = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				streamedText += chunk;

				setMessages((prev) => {
					const next = [...prev];
					if (next.length > 0) {
						next[next.length - 1] = {
							role: "assistant",
							content: streamedText,
						};
					}
					return next;
				});
			}

			// Save complete message list
			setMessages((prev) => {
				saveChatHistory(prev);
				return prev;
			});
		} catch (err: any) {
			console.error(err);
			setIsThinking(false);
			const errorMessage: Message = {
				role: "assistant",
				content: `⚠️ **Connection Error**: ${err.message || "Unable to connect to assistant."}`,
			};
			setMessages((prev) => {
				const next = [...prev, errorMessage];
				saveChatHistory(next);
				return next;
			});
		}
	};

	// Helper to remove [Suggest: ...] from rendered text
	const cleanContent = (content: string) => {
		const index = content.indexOf("[Suggest:");
		if (index !== -1) {
			return content.substring(0, index).trim();
		}
		return content;
	};

	// Helper to extract suggestions from text
	const parseSuggestions = (content: string) => {
		const suggestRegex = /\[Suggest:\s*(.*?)\]/g;
		let match;
		const suggestions: string[] = [];

		while ((match = suggestRegex.exec(content)) !== null) {
			if (match[1]) {
				suggestions.push(match[1].trim());
			}
		}
		return suggestions;
	};

	// Preprocessor to wrap standalone platform names in markdown images so they render as pills
	const injectPlatformMarkdown = (text: string) => {
		const platforms = [
			"Gmail",
			"WhatsApp",
			"Slack",
			"Outlook",
			"Discord",
			"LinkedIn",
			"Telegram",
		];
		let processed = text;

		platforms.forEach((p) => {
			// Matches the word p only if not preceded by ! or [ and not followed by .svg or .png
			const regex = new RegExp(`(?<![!\\\[])\\b${p}\\b(?!\\.svg|\\.png)`, "g");
			processed = processed.replace(regex, `![${p}](/${p.toLowerCase()}.svg)`);
		});

		return processed;
	};

	// Compile connected platforms for the header subtitle
	const getConnectedSubtitle = () => {
		const active = Object.entries(connectedPlatforms)
			.filter(([_, conn]) => conn)
			.map(([id, _]) => {
				if (id === "whatsapp") return "WhatsApp";
				if (id === "gmail") return "Gmail";
				if (id === "telegram") return "Telegram";
				if (id === "outlook") return "Outlook";
				return id;
			});

		if (active.length === 0) return "• No platforms connected";
		return `• Connected to ${active.join(" & ")}`;
	};

	// Grid prompt suggestions matching the reference layout
	const promptSuggestions = [
		{
			title: "Summarize my emails from today",
			prompt: "Summarize my emails from today",
			icon: <Mail className="w-5 h-5 text-blue-500" />,
			iconBg: "bg-blue-500/10",
		},
		{
			title: "Check pending WhatsApp messages",
			prompt: "Check pending WhatsApp messages",
			icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
			iconBg: "bg-emerald-500/10",
		},
		{
			title: "Draft a reply to Sarah's email",
			prompt:
				"Check my Gmail notifications and draft a reply to Sarah Jenkins' email feedback",
			icon: <FileText className="w-5 h-5 text-purple-500" />,
			iconBg: "bg-purple-500/10",
		},
		{
			title: "What are my priority action items?",
			prompt: "What are my priority action items?",
			icon: <Star className="w-5 h-5 text-amber-500" />,
			iconBg: "bg-amber-500/10",
		},
	];

	return (
		<div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
			{/* Outer Card Wrapper */}
			<div className="flex-1 flex flex-col border border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-slate-950/20 shadow-sm dark:shadow-none backdrop-blur-sm overflow-hidden">
				{/* Card Header matching reference layout */}
				<div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between flex-shrink-0">
					<div className="flex items-center space-x-4">
						<div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md flex-shrink-0">
							<Sparkles className="w-6 h-6 text-white animate-pulse" />
						</div>
						<div>
							<h3 className="text-base font-bold font-display text-slate-800 dark:text-white tracking-wide">
								OmniSync Intelligent Agent
							</h3>
							<p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
								{getConnectedSubtitle()}
							</p>
						</div>
					</div>
					<button
						onClick={() => startNewConversation()}
						className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-500/5 text-xs text-rose-600 dark:text-rose-400 font-bold transition-all cursor-pointer shadow-sm hover:shadow-rose-500/5">
						<Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-450" />
						<span>New Chat</span>
					</button>
				</div>

				{/* Scrollable Message Thread area */}
				<div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col bg-slate-50/10 dark:bg-slate-950/5">
					{/* Suggested Prompts Section - Shown only initially when messages list contains only welcome message */}
					{messages.length === 1 && (
						<div className="space-y-4 mb-4 animate-fade-in pl-11">
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
								Suggested Prompts:
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{promptSuggestions.map((item, idx) => (
									<button
										key={idx}
										onClick={() => handleSendMessage(item.prompt)}
										className="flex items-center space-x-4 p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm hover:shadow-md">
										<div
											className={`w-10 h-10 rounded-full flex items-center justify-center ${item.iconBg} flex-shrink-0`}>
											{item.icon}
										</div>
										<span className="text-sm font-semibold text-slate-700 dark:text-slate-250">
											{item.title}
										</span>
									</button>
								))}
							</div>
							<div className="border-b border-slate-100 dark:border-white/5 pt-4 my-2"></div>
						</div>
					)}

					{/* Render Conversations */}
					{messages.map((msg, index) => {
						const isUser = msg.role === "user";

						// pre-process assistant messages for inline badges
						const displayContent =
							isUser ? msg.content : injectPlatformMarkdown(msg.content);
						const suggestions = !isUser ? parseSuggestions(msg.content) : [];
						const isLast = index === messages.length - 1;

						return (
							<div
								key={index}
								className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}>
								<div
									className={`flex items-start space-x-3 max-w-[85%] ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}>
									{/* Icon Avatar */}
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
											isUser ?
												"border border-indigo-500/20 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400"
											:	"border border-purple-500/20 bg-purple-500/10 text-purple-650 dark:text-purple-400"
										}`}>
										{isUser ?
											<span className="text-xs font-bold uppercase">
												{userName.substring(0, 2)}
											</span>
										:	<Bot className="w-4 h-4" />}
									</div>

									{/* Message bubble */}
									<div
										className={`p-4 rounded-2xl shadow-sm dark:shadow-none leading-relaxed border ${
											isUser ?
												"rounded-tr-none bg-gradient-to-br from-indigo-600 to-indigo-500 border-indigo-600 dark:border-indigo-500 text-white"
											:	"rounded-tl-none bg-slate-50/50 dark:bg-white/5 border-slate-150 dark:border-white/5 text-slate-800 dark:text-slate-200"
										}`}>
										{isUser ?
											<p className="text-sm font-semibold whitespace-pre-wrap">
												{displayContent}
											</p>
										:	<div className="prose dark:prose-invert max-w-none text-sm font-medium">
												<ReactMarkdown
													remarkPlugins={[remarkGfm]}
													components={{
														h1: ({ children }) => (
															<h1 className="text-base font-bold mt-4 mb-2 text-slate-800 dark:text-white font-display border-b border-slate-200/50 dark:border-white/5 pb-1">
																{children}
															</h1>
														),
														h2: ({ children }) => (
															<h2 className="text-sm font-bold mt-3 mb-1.5 text-slate-800 dark:text-white font-display">
																{children}
															</h2>
														),
														h3: ({ children }) => (
															<h3 className="text-xs font-bold mt-2.5 mb-1 text-slate-800 dark:text-white font-display">
																{children}
															</h3>
														),
														p: ({ children }) => (
															<p className="mb-2 last:mb-0 leading-relaxed text-slate-700 dark:text-slate-300">
																{children}
															</p>
														),
														ul: ({ children }) => (
															<ul className="list-disc pl-5 mb-2.5 space-y-1 text-slate-700 dark:text-slate-300">
																{children}
															</ul>
														),
														ol: ({ children }) => (
															<ol className="list-decimal pl-5 mb-2.5 space-y-1 text-slate-700 dark:text-slate-300">
																{children}
															</ol>
														),
														li: ({ children }) => (
															<li className="text-xs sm:text-sm leading-relaxed">
																{children}
															</li>
														),
														a: ({ href, children }) => (
															<a
																href={href}
																target="_blank"
																rel="noopener noreferrer"
																className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center inline-flex space-x-1">
																{children}{" "}
																<ExternalLink className="w-3 h-3 ml-0.5 inline" />
															</a>
														),
														code: ({
															inline,
															className,
															children,
															...props
														}: any) => {
															const match = /language-(\w+)/.exec(
																className || "",
															);
															return !inline ?
																	<pre className="bg-slate-950 text-slate-205 p-3 rounded-xl text-xs overflow-x-auto my-3 font-mono border border-slate-800">
																		<code className={className} {...props}>
																			{children}
																		</code>
																	</pre>
																:	<code
																		className="bg-slate-100 dark:bg-slate-900 text-purple-650 dark:text-purple-400 px-1.5 py-0.5 rounded text-xs font-mono"
																		{...props}>
																		{children}
																	</code>;
														},
														// Styled Image renderer to format platform badges
														img: ({ src, alt }) => {
															const platform = alt?.toLowerCase() || "";
															if (
																[
																	"gmail",
																	"whatsapp",
																	"slack",
																	"outlook",
																	"discord",
																	"linkedin",
																	"telegram",
																].includes(platform)
															) {
																return (
																	<span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border border-slate-250 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-semibold text-slate-750 dark:text-slate-300 select-none mx-1 align-middle shadow-sm">
																		<img
																			src={src}
																			alt={alt}
																			className="w-3.5 h-3.5 object-contain"
																		/>
																		<span>{alt}</span>
																	</span>
																);
															}
															return (
																<img
																	src={src}
																	alt={alt}
																	className="rounded-xl my-2 max-w-full"
																/>
															);
														},
														table: ({ children }) => (
															<div className="overflow-x-auto my-3.5 border border-slate-200 dark:border-white/5 rounded-xl shadow-inner">
																<table className="min-w-full divide-y divide-slate-200 dark:divide-white/5 text-xs text-left">
																	{children}
																</table>
															</div>
														),
														thead: ({ children }) => (
															<thead className="bg-slate-50 dark:bg-white/5 font-semibold text-slate-750 dark:text-slate-350">
																{children}
															</thead>
														),
														tbody: ({ children }) => (
															<tbody className="divide-y divide-slate-250 dark:divide-white/5 bg-white dark:bg-slate-950/20">
																{children}
															</tbody>
														),
														tr: ({ children }) => (
															<tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
																{children}
															</tr>
														),
														th: ({ children }) => (
															<th className="px-4.5 py-2">{children}</th>
														),
														td: ({ children }) => (
															<td className="px-4.5 py-2 font-medium text-slate-650 dark:text-slate-400">
																{children}
															</td>
														),
													}}>
													{displayContent}
												</ReactMarkdown>
											</div>
										}
									</div>
								</div>

								{/* Suggestions pill options underneath the latest message */}
								{!isUser && isLast && !isThinking && suggestions.length > 0 && (
									<div className="flex flex-wrap gap-2.5 pl-11 mt-1.5 animate-fade-in">
										{suggestions.map((sug, sIdx) => (
											<button
												key={sIdx}
												onClick={() => handleSendMessage(sug)}
												className="px-3.5 py-1.5 rounded-xl border border-indigo-500/15 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs font-semibold text-indigo-650 dark:text-indigo-400 transition-all hover:scale-102 cursor-pointer shadow-sm hover:shadow-indigo-500/5">
												{sug}
											</button>
										))}
									</div>
								)}
							</div>
						);
					})}

					{/* Loader bubble while thinking */}
					{isThinking && (
						<div className="flex items-start space-x-3 max-w-[85%] animate-pulse">
							<div className="w-8 h-8 rounded-lg flex items-center justify-center border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 flex-shrink-0">
								<Bot className="w-4 h-4" />
							</div>
							<div className="p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-sm text-slate-600 dark:text-slate-400 flex items-center space-x-2 font-semibold shadow-sm">
								<Loader2 className="w-4 h-4 animate-spin text-purple-500 animate-spin" />
								<span>
									OmniSync Agent searching connected integrations and
									formulating response...
								</span>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>

				{/* Input area */}
				<div className="p-5 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center space-x-3 flex-shrink-0">
					<input
						type="text"
						value={inputMessage}
						onChange={(e) => setInputMessage(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSendMessage();
						}}
						disabled={isThinking}
						placeholder="Ask your agent to summarize WhatsApp, search Gmail, fetch schedules, draft emails..."
						className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-60 transition-all font-semibold shadow-inner"
					/>
					<button
						onClick={() => handleSendMessage()}
						disabled={isThinking || !inputMessage.trim()}
						className="h-12 w-12 rounded-2xl flex items-center justify-center bg-purple-650 hover:bg-purple-600 disabled:bg-purple-600/50 text-white transition-all shadow-lg shadow-purple-500/10 disabled:shadow-none cursor-pointer">
						{isThinking ?
							<Loader2 className="w-4 h-4 animate-spin" />
						:	<Send className="w-4 h-4" />}
					</button>
				</div>
			</div>
		</div>
	);
}
