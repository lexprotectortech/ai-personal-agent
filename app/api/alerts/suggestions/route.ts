import { NextResponse } from 'next/server';
import { gatherNotifications } from '../../../lib/alerts-engine';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    console.log(`[API Alerts Suggestions] Generating recommendations for user: ${userId}`);

    // Gather recent notifications from all apps to find patterns
    const recentNotifications = gatherNotifications(userId, ['gmail', 'whatsapp', 'telegram', 'outlook']);

    const prompt = `
    You are an AI Personal Assistant. Based on the following recent user notifications and communication activity, suggest exactly 3 custom alert rules that the user would find useful.

    Recent Activity Logs:
    ${JSON.stringify(recentNotifications, null, 2)}

    For each suggestion, provide:
    1. A short, descriptive name (e.g. "AWS outage alert" or "Investor follow-up")
    2. A brief description explaining why this is suggested (e.g., "Suggested based on recent system outage notifications on Discord.")
    3. The source apps involved (e.g., ["gmail", "whatsapp"])
    4. A natural language condition/trigger rule (e.g. "contains key terms: term sheet, investor, meeting" or "reports of AWS downtime or us-east-1 error rates")
    5. A priority level ("High", "Medium", "Low")
    6. A notification method ("In-App", "Email", "WhatsApp")
    7. A check frequency ("Real-time", "Hourly", "Daily")
    8. A default action to perform (e.g. "Flag immediately and draft email draft reply" or "Flag and text me")

    Return ONLY a JSON object containing the list of suggestions under the key "suggestions".
    Example:
    {
      "suggestions": [
        {
          "name": "Investor Flag",
          "description": "Suggested based on recent discussion with Bob and Sarah about the funding round.",
          "selected_apps": ["gmail", "whatsapp"],
          "condition_rule": "contains keywords: term sheet, financials, investment, valuation",
          "priority_level": "High",
          "notification_method": "In-App",
          "frequency": "Real-time",
          "action_to_perform": "Flag thread and notify immediately"
        }
      ]
    }
    `;

    let suggestions: any[] = [];
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
            maxOutputTokens: 1000
          }
        });

        let text = response.text || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(text);
        suggestions = parsed.suggestions || [];
      } catch (err) {
        console.error('[API Alerts Suggestions] Gemini API failed:', err);
      }
    }

    if (suggestions.length === 0 && openRouterApiKey) {
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
          max_tokens: 1000
        });

        let text = completion.choices[0]?.message?.content || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(text);
        suggestions = parsed.suggestions || [];
      } catch (err) {
        console.error('[API Alerts Suggestions] OpenRouter API failed:', err);
      }
    }

    // Fallback static suggestions if both fail
    if (suggestions.length === 0) {
      suggestions = [
        {
          name: "Investor updates",
          description: "Recommended because of recent chats about funding rounds.",
          selected_apps: ["gmail", "whatsapp"],
          condition_rule: "contains: term sheet, valuation, cap table, investment",
          priority_level: "High",
          notification_method: "In-App",
          frequency: "Real-time",
          action_to_perform: "Draft automatic reply and notify"
        },
        {
          name: "System Warnings",
          description: "Recommended because of recent server status messages.",
          selected_apps: ["telegram", "slack"],
          condition_rule: "contains: AWS outage, error rate, down, failed migration",
          priority_level: "High",
          notification_method: "WhatsApp",
          frequency: "Real-time",
          action_to_perform: "Notify via SMS/WA"
        },
        {
          name: "Calendar Warnings",
          description: "Recommended because of roadmap changes.",
          selected_apps: ["outlook"],
          condition_rule: "contains: conflict warning, overlap, roadmap change",
          priority_level: "Medium",
          notification_method: "In-App",
          frequency: "Hourly",
          action_to_perform: "Flag and suggest reschedule"
        }
      ];
    }

    return NextResponse.json({ success: true, suggestions });
  } catch (err: any) {
    console.error('API Alerts Suggestions error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
