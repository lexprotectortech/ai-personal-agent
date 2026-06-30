import { insforge } from "./insforge";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// 1. Gather recent notifications from selected apps (simulated or real)
export function gatherNotifications(userId: string, selectedApps: string[]): any[] {
  const notifications: any[] = [];
  const now = Math.floor(Date.now() / 1000);

  // --- WhatsApp ---
  if (selectedApps.includes("whatsapp")) {
    const storeFile = path.join(process.cwd(), ".sessions", `whatsapp_${userId}_store.json`);
    let loadedRealMsgs = false;
    
    if (fs.existsSync(storeFile)) {
      try {
        const storeData = JSON.parse(fs.readFileSync(storeFile, "utf8"));
        const messagesMap = storeData.messages || {};
        
        Object.keys(messagesMap).forEach((chatId) => {
          const chatMsgs = messagesMap[chatId] || [];
          const lastMsg = chatMsgs[chatMsgs.length - 1];
          if (lastMsg) {
            const text = lastMsg.message?.conversation || 
                         lastMsg.message?.extendedTextMessage?.text || 
                         lastMsg.message?.imageMessage?.caption || "";
            if (text) {
              notifications.push({
                id: lastMsg.key?.id || `wa-${Math.random()}`,
                source: "whatsapp",
                category: text.toLowerCase().includes("task") || text.toLowerCase().includes("todo") ? "tasks" : "messages",
                sender: lastMsg.pushName || chatId.split("@")[0],
                text: text,
                timestamp: lastMsg.messageTimestamp || now
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
      notifications.push({
        id: "wa-sim-1",
        source: "whatsapp",
        category: "messages",
        sender: "Alice (Marketing)",
        text: "Hey, did you finish the draft proposal for the marketing campaign? We need this signed off by the investor today! #urgent",
        timestamp: now - 120
      });
      notifications.push({
        id: "wa-sim-2",
        source: "whatsapp",
        category: "messages",
        sender: "Bob (Eng)",
        text: "Are we still on for the sync tomorrow at 10 AM? I have some questions about the term sheet.",
        timestamp: now - 300
      });
      notifications.push({
        id: "wa-sim-3",
        source: "whatsapp",
        category: "tasks",
        sender: "Charlie (Project Alpha)",
        text: "#task Let's finalize the contract terms by Friday so we can close the funding round.",
        timestamp: now - 1800
      });
    }
  }

  // --- Gmail (Simulated) ---
  if (selectedApps.includes("gmail")) {
    notifications.push({
      id: "gm-sim-1",
      source: "gmail",
      category: "email",
      sender: "Sarah Jenkins (Product)",
      text: "Urgent: UI feedback on Personal AI Agent dashboard. We need to adjust card layouts to support HSL tailwind colors. Sync today at 4 PM.",
      timestamp: now - 3600
    });
    notifications.push({
      id: "gm-sim-2",
      source: "gmail",
      category: "email",
      sender: "Google Billing",
      text: "Your Google Cloud invoice of $1,420 is now available for review and auto-payment tomorrow.",
      timestamp: now - 7200
    });
    notifications.push({
      id: "gm-sim-3",
      source: "gmail",
      category: "mentions",
      sender: "Github Notifications",
      text: "[Mention] @developer-user tagged you on issue #249: 'Need approval on the Dockerfile updates for staging deployment.'",
      timestamp: now - 10800
    });
  }

  // --- Telegram (Simulated) ---
  if (selectedApps.includes("telegram")) {
    notifications.push({
      id: "tg-sim-1",
      source: "telegram",
      category: "messages",
      sender: "Solana Developer Chat",
      text: "#announcement Node operators must patch to version 1.18.15. Mainnet software updates tonight at 23:00 UTC.",
      timestamp: now - 10800
    });
    notifications.push({
      id: "tg-sim-2",
      source: "telegram",
      category: "followups",
      sender: "Daniel (Design)",
      text: "Did you get a chance to review the new design files? Let me know your thoughts on the investor pitch deck.",
      timestamp: now - 15000
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
      timestamp: now - 14400
    });
  }

  // --- Slack (Simulated) ---
  if (selectedApps.includes("slack")) {
    notifications.push({
      id: "sl-sim-1",
      source: "slack",
      category: "messages",
      sender: "Dev Team Slack",
      text: "Deployment warning: Staging is currently broken due to a Postgres migration issue. Please do not deploy.",
      timestamp: now - 600
    });
  }

  // --- Discord (Simulated) ---
  if (selectedApps.includes("discord")) {
    notifications.push({
      id: "ds-sim-1",
      source: "discord",
      category: "messages",
      sender: "Announcements Discord",
      text: "System Alert: AWS us-east-1 is experiencing elevated error rates. Some services might fail.",
      timestamp: now - 1200
    });
  }

  return notifications;
}

// 2. Evaluate all active alert rules for a specific user
export async function evaluateAlertRules(userId: string): Promise<any[]> {
  console.log(`[Alerts Engine] Evaluating alert rules for user: ${userId}`);

  // Fetch active alert rules
  const { data: rules, error: rulesError } = await insforge.database
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (rulesError) {
    console.error("[Alerts Engine] Error fetching alert rules:", rulesError);
    return [];
  }

  if (!rules || rules.length === 0) {
    console.log("[Alerts Engine] No active alert rules found for user.");
    return [];
  }

  // Compile all unique selected apps across rules
  const allSelectedApps = Array.from(
    new Set(rules.flatMap((rule) => rule.selected_apps || []))
  );

  if (allSelectedApps.length === 0) {
    console.log("[Alerts Engine] No apps selected in rules.");
    return [];
  }

  // Gather notifications
  const notifications = gatherNotifications(userId, allSelectedApps);

  if (notifications.length === 0) {
    console.log("[Alerts Engine] No notifications gathered.");
    return [];
  }

  // Use AI to match notifications with rules
  const prompt = `
  You are an AI Personal Assistant. Your job is to check a set of recent notifications against a list of active alert rules defined by the user.

  Active Alert Rules:
  ${JSON.stringify(rules, null, 2)}

  Recent Notifications:
  ${JSON.stringify(notifications, null, 2)}

  Task:
  Analyze each notification and determine if it matches the "condition_rule" of any active alert rule.
  
  Match Guidelines:
  - Match semantically: For example, if a rule says "contains keywords: term sheet, financials" and an email contains "Here is the term sheet for our pre-seed round", it matches.
  - If a notification overlaps or triggers a conflict warning in a calendar context (e.g. roadmap alignment overlaps design critique) and the rule is about conflict warning, it matches.
  - Make sure the notification's "source" matches one of the "selected_apps" of that rule.

  Output Format:
  Return a JSON object containing an array of matched alerts under the key "matches".
  Each match must have:
  - "rule_id": UUID of the matched rule
  - "title": A short alert title (e.g. "[Investor Flag] Term Sheet discussion") under 50 characters
  - "description": A concise description explaining the trigger (e.g. "Email from Sarah Jenkins containing term sheet details") under 120 characters
  - "source_app": The source app of the notification (e.g. "gmail", "whatsapp")
  - "priority_level": The priority level of the rule ("High" | "Medium" | "Low")
  - "raw_content": The full text/message snippet that triggered it
  - "ai_summary": A concise 1-sentence summary of the context (under 80 characters)
  - "ai_next_action": A short suggested next action (e.g., "Reply to Sarah to confirm meeting time", "Reschedule design critique")

  If no notifications match any rules, return {"matches": []}.
  Return ONLY the raw JSON object. Do not include markdown blocks or extra text.
  `;

  let matchResult: { matches: any[] } | null = null;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1200
        }
      });

      let text = response.text || '';
      text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      matchResult = JSON.parse(text);
    } catch (err) {
      console.error("[Alerts Engine] Gemini rule matching failed:", err);
    }
  }

  if (!matchResult && openRouterApiKey) {
    try {
      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://personal-agent.local',
          'X-Title': 'Personal AI Agent',
        }
      });

      const completion = await openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1200
      });

      let text = completion.choices[0]?.message?.content || '';
      text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      matchResult = JSON.parse(text);
    } catch (err) {
      console.error("[Alerts Engine] OpenRouter rule matching failed:", err);
    }
  }

  // If both AI options failed, return empty array
  if (!matchResult || !matchResult.matches) {
    console.log("[Alerts Engine] Match results empty or failed.");
    return [];
  }

  const triggeredAlerts: any[] = [];

  for (const match of matchResult.matches) {
    try {
      // 1. Check for duplicates in DB within the last hour to prevent duplicate inserts
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await insforge.database
        .from("triggered_alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("rule_id", match.rule_id)
        .eq("raw_content", match.raw_content)
        .gt("created_at", oneHourAgo);

      if (existing && existing.length > 0) {
        console.log(`[Alerts Engine] Duplicate alert skipped: rule_id=${match.rule_id}`);
        continue;
      }

      // 2. Save new triggered alert to DB
      const newAlert = {
        user_id: userId,
        rule_id: match.rule_id,
        title: match.title,
        description: match.description,
        source_app: match.source_app,
        priority_level: match.priority_level,
        status: "Active",
        raw_content: match.raw_content,
        ai_summary: match.ai_summary,
        ai_next_action: match.ai_next_action,
        time: new Date().toISOString()
      };

      const { data: inserted, error: insertError } = await insforge.database
        .from("triggered_alerts")
        .insert([newAlert])
        .select()
        .single();

      if (insertError) {
        console.error("[Alerts Engine] Error inserting triggered alert:", insertError);
        continue;
      }

      if (inserted) {
        triggeredAlerts.push(inserted);
        console.log(`[Alerts Engine] Inserted alert: ${inserted.title}`);

        // 3. Publish to Realtime user channel
        const publishRes = await insforge.realtime.publish(
          `alerts:${userId}`,
          "alert_triggered",
          inserted
        );
        console.log(`[Alerts Engine] Published realtime alert event:`, publishRes);
      }
    } catch (err) {
      console.error("[Alerts Engine] Failed to process rule match:", err);
    }
  }

  return triggeredAlerts;
}
