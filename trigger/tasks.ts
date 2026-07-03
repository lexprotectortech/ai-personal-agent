import { task, schedules } from "@trigger.dev/sdk";
import { insforge } from "../app/lib/insforge";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { evaluateAlertRules } from "../app/lib/alerts-engine";
import { fetchRecentEmails } from "../app/lib/gmail-api";

// 1. Cron Job: check schedules every 15 minutes
export const checkSchedulesCron = schedules.task({
	id: "check-schedules-cron",
	cron: {
		pattern: "*/15 * * * *", // Runs every 15 minutes
	},
	run: async (payload) => {
		console.log(
			`[Cron] Checking for due briefing runs at: ${payload.timestamp}`,
		);

		// Call stored procedure to claim due schedules (lookahead of 15 minutes)
		const { data: dueSchedules, error } = await insforge.database.rpc(
			"claim_due_briefing_schedules",
			{ lookahead_minutes: 15 },
		);

		if (error) {
			console.error("[Cron] Error claiming due schedules:", error);
			return { success: false, error: error.message };
		}

		if (!dueSchedules || dueSchedules.length === 0) {
			console.log("[Cron] No schedules due in this window.");
			return { success: true, count: 0 };
		}

		console.log(
			`[Cron] Found ${dueSchedules.length} schedules due. Triggering generator runs...`,
		);

		const runPromises = dueSchedules.map(async (schedule: any) => {
			try {
				await generateBriefing.trigger({
					scheduleId: schedule.id,
					userId: schedule.user_id,
					name: schedule.name,
					description: schedule.description || "",
					selectedApps: schedule.selected_apps || [],
					selectedCategories: schedule.selected_categories || [],
					priorityLevel: schedule.priority_level || "Medium",
				});
				console.log(
					`[Cron] Triggered generateBriefing for schedule: ${schedule.id} (${schedule.name})`,
				);
			} catch (err: any) {
				console.error(
					`[Cron] Failed to trigger run for schedule ${schedule.id}:`,
					err,
				);
			}
		});

		await Promise.all(runPromises);

		return { success: true, count: dueSchedules.length };
	},
});

// Helper to gather notifications for selected platforms
async function gatherChannelNotifications(
	userId: string,
	selectedApps: string[],
): Promise<any[]> {
	const notifications: any[] = [];
	const now = Math.floor(Date.now() / 1000);

	// --- WhatsApp ---
	if (selectedApps.includes("whatsapp")) {
		const storeFile = path.join(
			process.cwd(),
			".sessions",
			`whatsapp_${userId}_store.json`,
		);
		let loadedRealMsgs = false;
		if (fs.existsSync(storeFile)) {
			try {
				const storeData = JSON.parse(fs.readFileSync(storeFile, "utf8"));
				const messagesMap = storeData.messages || {};

				Object.keys(messagesMap).forEach((chatId) => {
					const chatMsgs = messagesMap[chatId] || [];
					const lastMsg = chatMsgs[chatMsgs.length - 1];
					if (lastMsg) {
						// Baileys message formatting
						const text =
							lastMsg.message?.conversation ||
							lastMsg.message?.extendedTextMessage?.text ||
							lastMsg.message?.imageMessage?.caption ||
							"";
						if (text) {
							notifications.push({
								id: lastMsg.key?.id || `wa-${Math.random()}`,
								source: "whatsapp",
								category:
									(
										text.toLowerCase().includes("task") ||
										text.toLowerCase().includes("todo")
									) ?
										"tasks"
									:	"messages",
								sender: lastMsg.pushName || chatId.split("@")[0],
								text: text,
								timestamp: lastMsg.messageTimestamp || now,
							});
							loadedRealMsgs = true;
						}
					}
				});
			} catch (e) {
				console.error("Error reading WhatsApp store file in worker:", e);
			}
		}

		if (!loadedRealMsgs) {
			// simulated whatsapp messages
			notifications.push({
				id: "wa-sim-1",
				source: "whatsapp",
				category: "messages",
				sender: "Alice (Marketing)",
				text: "Hey, did you finish the draft proposal for the marketing campaign? #urgent",
				timestamp: now - 120,
			});
			notifications.push({
				id: "wa-sim-2",
				source: "whatsapp",
				category: "messages",
				sender: "Bob (Eng)",
				text: "Are we still on for the sync tomorrow at 10 AM?",
				timestamp: now - 300,
			});
			notifications.push({
				id: "wa-sim-3",
				source: "whatsapp",
				category: "tasks",
				sender: "Charlie (Project Alpha)",
				text: "#task Let's finalize the contract terms by Friday.",
				timestamp: now - 1800,
			});
		}
	}

	// --- Gmail ---
	if (selectedApps.includes("gmail")) {
		try {
			const realEmails = await fetchRecentEmails(userId, 5);
			if (realEmails && realEmails.length > 0) {
				realEmails.forEach((email) => {
					notifications.push({
						id: email.id,
						threadId: email.threadId,
						source: "gmail",
						category: "email",
						sender: email.from,
						text: `${email.subject}: ${email.snippet}`,
						timestamp: email.timestamp,
					});
				});
			} else {
				console.log(
					`[Worker] No real unread Gmail emails found for user ${userId}.`,
				);
			}
		} catch (err) {
			console.error("[Worker] Error fetching real Gmail emails:", err);
		}
	}

	// --- Telegram (Simulated) ---
	if (selectedApps.includes("telegram")) {
		notifications.push({
			id: "tg-sim-1",
			source: "telegram",
			category: "messages",
			sender: "Solana Developer Chat",
			text: "#announcement Node operators must patch to version 1.18.15. Mainnet upgrade tonight at 23:00 UTC.",
			timestamp: now - 10800,
		});
		notifications.push({
			id: "tg-sim-2",
			source: "telegram",
			category: "followups",
			sender: "Daniel (Design)",
			text: "Did you get a chance to review the new design files? Let me know your thoughts.",
			timestamp: now - 15000,
		});
	}

	// --- Outlook (Simulated) ---
	if (selectedApps.includes("outlook")) {
		notifications.push({
			id: "ol-sim-1",
			source: "outlook",
			category: "tasks",
			sender: "Calendar Invite",
			text: "Q3 Product Roadmap Alignment - Scheduled for tomorrow at 2:00 PM (Organizer: CEO). Note: Overlaps with weekly design critique.",
			timestamp: now - 14400,
		});
	}

	return notifications;
}

// 2. Worker Job: Generate Briefing using AI
export const generateBriefing = task({
	id: "generate-briefing",
	run: async (payload: {
		scheduleId?: string;
		userId: string;
		name: string;
		description: string;
		selectedApps: string[];
		selectedCategories: string[];
		priorityLevel: string;
	}) => {
		const {
			scheduleId,
			userId,
			name,
			description,
			selectedApps,
			selectedCategories,
			priorityLevel,
		} = payload;
		console.log(
			`[Worker] Starting briefing run for user: ${userId}, schedule: ${scheduleId || "Default"}`,
		);

		// Gather logs/notifications
		const notifications = await gatherChannelNotifications(
			userId,
			selectedApps,
		);

		// Filter by selected categories if specified
		const filteredNotifications = notifications.filter((item) => {
			// Map item category to filterable categories
			// Selected categories e.g. ['email', 'messages', 'mentions', 'tasks', 'followups']
			if (selectedCategories.length === 0) return true;
			return selectedCategories.includes(item.category);
		});

		if (filteredNotifications.length === 0) {
			const emptyContent = {
				topHighlightedBrief: {
					title: "All Quiet Today",
					summary: "No new updates found in the selected channels.",
				},
				categorySummaries: {
					email: { count: 0, summary: "No new emails." },
					messages: { count: 0, summary: "No new messages." },
					mentions: { count: 0, summary: "No new mentions." },
					tasks: { count: 0, summary: "No new tasks." },
					followups: { count: 0, summary: "No pending follow-ups." },
				},
				items: [],
			};

			const { data, error } = await insforge.database.rpc(
				"save_generated_briefing",
				{
					user_id_val: userId,
					schedule_id_val: scheduleId || null,
					name_val: name,
					content_val: emptyContent,
				},
			);

			if (error) {
				console.error("[Worker] Error saving empty briefing:", error);
				throw error;
			}

			return { success: true, briefingId: data };
		}

		// Build the AI Prompt
		const prompt = `
    You are an AI Personal Assistant. You are compiling a personalized executive briefing for the user based on recent logs from their communication accounts.

    Briefing Configuration:
    - Name: ${name}
    - Goal/Focus: ${description || "General Daily Summary"}
    - Target Apps: ${selectedApps.join(", ")}
    - Target Categories: ${selectedCategories.join(", ")}
    - Priority Filter: ${priorityLevel}

    Data Payload (Recent notifications):
    ${JSON.stringify(filteredNotifications, null, 2)}

    Please analyze the data and generate a structured JSON object containing:
    1. "topHighlightedBrief": An object with a "title" (e.g. "Urgent Marketing Campaign Update", under 40 characters) and a "summary" (under 120 characters, summarizing the absolute most critical update/conflict that the user must know).
    2. "categorySummaries": An object with keys: "email", "messages", "mentions", "tasks", "followups". Each key should contain an object: { "count": (number), "summary": (concise 1-sentence category summary under 70 characters) }. Ensure the counts reflect the actual matching items provided.
    3. "items": An array of parsed notification details. Each item must contain:
       - "id": The original ID or a unique string
       - "source": "gmail" | "whatsapp" | "telegram" | "outlook"
       - "category": "email" | "messages" | "mentions" | "tasks" | "followups"
       - "sender": sender name/email
       - "text": original snippet text
       - "summary": a concise 1-sentence summary of this specific notification (under 60 characters)
       - "timestamp": time string (e.g. "10m ago", "1h ago")
       - "actionRequired": boolean (true if action is requested of the user)
       - "suggestedAction": a short string suggesting what action the user should take (e.g. "Reply to Alice", "Approve PR", "Reschedule design critique", or null if none)

    You MUST return ONLY a valid JSON object matching this schema. Keep descriptions and summaries extremely concise so it fits nicely on a dashboard. Do not enclose it in markdown blocks or write any extra conversational text.
    `;

		let briefData: any = null;
		const geminiApiKey = process.env.GEMINI_API_KEY;
		const openRouterApiKey = process.env.OPENROUTER_API_KEY;

		if (geminiApiKey) {
			try {
				const ai = new GoogleGenAI({ apiKey: geminiApiKey });
				const response = await ai.models.generateContent({
					model: "gemini-2.5-flash",
					contents: prompt,
					config: {
						responseMimeType: "application/json",
						maxOutputTokens: 1000,
					},
				});

				let text = response.text || "";
				text = text
					.replace(/^```json\s*/, "")
					.replace(/```\s*$/, "")
					.trim();
				briefData = JSON.parse(text);
			} catch (err) {
				console.error("[Worker] Error generating brief via Gemini SDK:", err);
			}
		}

		if (!briefData && openRouterApiKey) {
			try {
				const openai = new OpenAI({
					baseURL: "https://openrouter.ai/api/v1",
					apiKey: openRouterApiKey,
					defaultHeaders: {
						"HTTP-Referer": "https://personal-agent.local",
						"X-Title": "Personal AI Agent",
					},
				});

				const completion = await openai.chat.completions.create({
					model: "google/gemini-2.5-flash",
					messages: [{ role: "user", content: prompt }],
					response_format: { type: "json_object" },
					max_tokens: 1000,
				});

				let text = completion.choices[0]?.message?.content || "";
				text = text
					.replace(/^```json\s*/, "")
					.replace(/```\s*$/, "")
					.trim();
				briefData = JSON.parse(text);
			} catch (err) {
				console.error("[Worker] Error generating brief via OpenRouter:", err);
			}
		}

		// Static fallback if AI fails or keys missing
		if (!briefData) {
			console.log("[Worker] Using mock fallback briefing data");

			const counts = {
				email: filteredNotifications.filter((n) => n.category === "email")
					.length,
				messages: filteredNotifications.filter((n) => n.category === "messages")
					.length,
				mentions: filteredNotifications.filter((n) => n.category === "mentions")
					.length,
				tasks: filteredNotifications.filter((n) => n.category === "tasks")
					.length,
				followups: filteredNotifications.filter(
					(n) => n.category === "followups",
				).length,
			};

			briefData = {
				topHighlightedBrief: {
					title: "Simulated Dashboard Summary",
					summary:
						"Sarah Jenkins requested urgent UI alignment feedback. Node upgrade scheduled for Solana devnet.",
				},
				categorySummaries: {
					email: {
						count: counts.email,
						summary:
							counts.email > 0 ?
								"You have new unread emails from Sarah Jenkins."
							:	"No new emails.",
					},
					messages: {
						count: counts.messages,
						summary:
							counts.messages > 0 ?
								"New messages on WhatsApp and Telegram."
							:	"No new messages.",
					},
					mentions: {
						count: counts.mentions,
						summary:
							counts.mentions > 0 ?
								"You were tagged in a Github issue."
							:	"No new mentions.",
					},
					tasks: {
						count: counts.tasks,
						summary:
							counts.tasks > 0 ?
								"Immediate roadmap alignment items pending."
							:	"No outstanding tasks.",
					},
					followups: {
						count: counts.followups,
						summary:
							counts.followups > 0 ?
								"Daniel is waiting for your design critique feedback."
							:	"No pending follow-ups.",
					},
				},
				items: filteredNotifications.map((n, idx) => ({
					id: n.id,
					source: n.source,
					category: n.category,
					sender: n.sender,
					text: n.text,
					summary: n.text.slice(0, 50) + "...",
					timestamp: "Just now",
					actionRequired: true,
					suggestedAction:
						n.category === "email" ? "Reply to Sarah"
						: n.category === "tasks" ? "Resolve conflict"
						: "Acknowledge message",
				})),
			};
		}

		// Save briefing to DB using the RPC
		const { data: savedId, error: saveError } = await insforge.database.rpc(
			"save_generated_briefing",
			{
				user_id_val: userId,
				schedule_id_val: scheduleId || null,
				name_val: name,
				content_val: briefData,
			},
		);

		if (saveError) {
			console.error(
				"[Worker] Error saving generated briefing to DB:",
				saveError,
			);
			throw saveError;
		}

		console.log(
			`[Worker] Successfully completed briefing run. Briefing ID: ${savedId}`,
		);

		return { success: true, briefingId: savedId };
	},
});

// Hello World Task
export const helloWorld = task({
	id: "hello-world",
	run: async (payload: { message?: string }) => {
		const greeting = payload.message || "Hello, World!";
		console.log(`[Hello World] Run executed with payload:`, payload);
		return {
			message: greeting,
			timestamp: new Date().toISOString(),
		};
	},
});

// 3. Cron Job: check alerts every 15 minutes for all users
export const checkAlertsCron = schedules.task({
	id: "check-alerts-cron",
	cron: {
		pattern: "*/15 * * * *", // Runs every 15 minutes
	},
	run: async (payload) => {
		console.log(
			`[Cron] Checking alert rules for all users at: ${payload.timestamp}`,
		);

		// Fetch all users
		const { data: users, error } = await insforge.database
			.from("users")
			.select("id");

		if (error) {
			console.error("[Cron] Error fetching users for alerts check:", error);
			return { success: false, error: error.message };
		}

		if (!users || users.length === 0) {
			console.log("[Cron] No users found.");
			return { success: true, count: 0 };
		}

		console.log(`[Cron] Triggering alert check for ${users.length} users...`);

		const triggerPromises = users.map(async (user: any) => {
			try {
				await checkUserAlertRules.trigger({ userId: user.id });
			} catch (err: any) {
				console.error(
					`[Cron] Failed to trigger alert check for user ${user.id}:`,
					err,
				);
			}
		});

		await Promise.all(triggerPromises);
		return { success: true, count: users.length };
	},
});

// 4. Worker Job: Check alert rules for a specific user
export const checkUserAlertRules = task({
	id: "check-user-alert-rules",
	run: async (payload: { userId: string }) => {
		const { userId } = payload;
		console.log(`[Worker] Running alert check for user: ${userId}`);

		try {
			const newAlerts = await evaluateAlertRules(userId);
			console.log(
				`[Worker] Alert check complete. Triggered ${newAlerts.length} new alerts for user ${userId}.`,
			);
			return { success: true, triggeredCount: newAlerts.length };
		} catch (err: any) {
			console.error(
				`[Worker] Error running evaluateAlertRules for user ${userId}:`,
				err,
			);
			throw err;
		}
	},
});
