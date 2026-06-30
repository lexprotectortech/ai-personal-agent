import { NextResponse } from 'next/server';
import { insforge } from '../../../lib/insforge';
import { 
  whatsappConnections, 
  getMessageSender, 
  getMessageText 
} from '../../../lib/whatsapp-manager';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    // Determine which card type to load ('summary' or 'priority')
    const url = new URL(request.url);
    const card = url.searchParams.get('card') || 'summary';

    // Try to parse forceRefresh from request body
    let forceRefresh = false;
    try {
      const body = await request.clone().json();
      if (body && body.forceRefresh) {
        forceRefresh = true;
      }
    } catch (e) {
      // Body may be empty, ignore
    }

    // 0. Check database cache if not forcing a refresh
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await insforge.database
        .from('dashboard_briefs')
        .select('brief_data, updated_at')
        .eq('user_id', userId)
        .eq('card_type', card);

      if (cacheError) {
        console.error(`Error fetching cached dashboard brief for card ${card}:`, cacheError);
      } else if (cachedData && cachedData.length > 0) {
        const cached = cachedData[0];
        const updatedAt = new Date(cached.updated_at).getTime();
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

        if (updatedAt > twoHoursAgo) {
          console.log(`Returning cached dashboard brief for card ${card} from DB`);
          return NextResponse.json({ success: true, ...cached.brief_data });
        }
      }
    }

    // 1. Fetch connected platforms for the user from InsForge database
    const { data: integrations, error: dbError } = await insforge.database
      .from('user_integrations')
      .select('platform_id, is_connected')
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database query error:', dbError);
    }

    const connectedMap: Record<string, boolean> = {};
    if (integrations) {
      integrations.forEach((row: any) => {
        connectedMap[row.platform_id] = !!row.is_connected;
      });
    }

    // 2. Gather notifications and messages across channels
    const notifications: any[] = [];

    // --- WhatsApp ---
    if (connectedMap['whatsapp']) {
      const conn = whatsappConnections[userId];
      if (conn) {
        if (conn.isSimulated) {
          // Use realistic simulated messages for sandbox mode
          notifications.push({
            source: 'whatsapp',
            sender: 'Alice (Marketing)',
            text: 'Hey, did you finish the draft proposal for the marketing campaign? #urgent',
            timestamp: Math.floor(Date.now() / 1000)
          });
          notifications.push({
            source: 'whatsapp',
            sender: 'Bob (Eng)',
            text: 'Are we still on for the sync tomorrow at 10 AM?',
            timestamp: Math.floor(Date.now() / 1000) - 300
          });
          notifications.push({
            source: 'whatsapp',
            sender: 'Charlie (Project Alpha)',
            text: '#task Let\'s finalize the contract terms by Friday.',
            timestamp: Math.floor(Date.now() / 1000) - 1800
          });
        } else if (conn.status === 'connected' && conn.store) {
          const chats = conn.store.chats.all();
          for (const chat of chats) {
            const msgs = conn.store.messages[chat.id];
            const rawMsgs = Array.isArray(msgs) ? msgs : (msgs?.toArray ? msgs.toArray() : []);
            const lastMsg = rawMsgs[rawMsgs.length - 1];
            if (lastMsg) {
              notifications.push({
                source: 'whatsapp',
                sender: getMessageSender(lastMsg, conn.store),
                text: getMessageText(lastMsg),
                timestamp: lastMsg.messageTimestamp
              });
            }
          }
        }
      } else {
        // Fallback simulated notifications if database says WhatsApp is connected but memory socket is not ready yet
        notifications.push({
          source: 'whatsapp',
          sender: 'System Alert',
          text: 'WhatsApp integration is linked. Sandbox mode active.',
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
    }

    // --- Gmail (Simulated data if connected) ---
    if (connectedMap['gmail']) {
      notifications.push({
        source: 'gmail',
        sender: 'Sarah Jenkins (Product)',
        text: 'Urgent: UI feedback on Personal AI Agent dashboard. We need to adjust card layouts to support HSL tailwind colors. Sync today at 4 PM.',
        timestamp: Math.floor(Date.now() / 1000) - 3600
      });
      notifications.push({
        source: 'gmail',
        sender: 'Google Billing',
        text: 'Your Google Cloud invoice is now available for review.',
        timestamp: Math.floor(Date.now() / 1000) - 7200
      });
    }

    // --- Telegram (Simulated data if connected) ---
    if (connectedMap['telegram']) {
      notifications.push({
        source: 'telegram',
        sender: 'Solana Developer Chat',
        text: '#announcement Node operators must patch to version 1.18.15. Mainnet upgrade tonight at 23:00 UTC.',
        timestamp: Math.floor(Date.now() / 1000) - 10800
      });
    }

    // --- Outlook (Simulated calendar if connected) ---
    if (connectedMap['outlook']) {
      notifications.push({
        source: 'outlook',
        sender: 'Calendar Invite',
        text: 'Q3 Product Roadmap Alignment - Scheduled for tomorrow at 2:00 PM (Organizer: CEO). Note: Overlaps with weekly design critique.',
        timestamp: Math.floor(Date.now() / 1000) - 14400
      });
    }

    // If no platforms are connected yet, provide a baseline guidance notification
    if (notifications.length === 0) {
      notifications.push({
        source: 'system',
        sender: 'OmniSync Assistant',
        text: 'Welcome to OmniSync! Connect communication accounts in the Integrations tab to start summarizing messages and tracking priority action items.',
        timestamp: Math.floor(Date.now() / 1000)
      });
    }

    // 3. Define prompt specific to card type to keep it short & fast
    let prompt = '';
    if (card === 'priority') {
      prompt = `
      You are an AI Personal Assistant. You are preparing the top priority action items for the user's dashboard based on the following recent notifications from their connected communication channels:

      ${JSON.stringify(notifications, null, 2)}

      Please analyze these notifications and generate a structured JSON object containing:
      - "priorityItems": An array of the top 2 priority actions (each with: "id", "source" ('whatsapp' | 'gmail' | 'telegram' | 'outlook'), "title" (e.g. "Q3 Budget Review" or "Mainnet Upgrade", under 30 characters), "time" (e.g. "10m ago"), "description" (a very concise 1-sentence action summary under 80 characters), "priority" ('High' | 'Medium' | 'Low'))

      You MUST return ONLY a valid JSON object matching this schema. Keep descriptions and titles extremely concise so it can generate in few seconds. Do not enclose it in markdown blocks or write any extra text.
      `;
    } else {
      prompt = `
      You are an AI Personal Assistant. You are preparing Today's Executive Brief and stats counts for the user's dashboard based on the following recent notifications from their connected communication channels:

      ${JSON.stringify(notifications, null, 2)}

      Please analyze these notifications and generate a structured JSON object containing:
      1. "importantCount": (number: total count of items that are highly relevant or require attention)
      2. "priorityCount": (number: count of High/Medium priority items)
      3. "followUpsCount": (number: count of actions requiring follow-ups or replies)
      4. "brief": An array of today's brief summary blocks (max 3 items, each with: "id", "source" ('whatsapp' | 'gmail' | 'telegram' | 'outlook'), "iconName" ('message-square' | 'mail' | 'send' | 'calendar'), "summary" (under 60 characters summarizing the message/topic concisely), "timestamp" (under 15 characters, e.g. "10m ago" or "1h ago"))

      You MUST return ONLY a valid JSON object matching this schema. Keep summaries extremely short, clear, and direct so it can generate in few seconds. Do not enclose it in markdown blocks or write any extra text.
      `;
    }

    // 4. Call Gemini Model using Google Gen AI SDK
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    let briefData: any = null;

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 350
          }
        });

        let text = response.text || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        briefData = JSON.parse(text);
      } catch (err) {
        console.error('Error generating brief via Google Gen AI SDK:', err);
      }
    }

    // 5. Fallback to OpenRouter (OpenAI SDK) using google/gemini-2.5-flash model
    if (!briefData && openRouterApiKey) {
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
          max_tokens: 350
        });

        let text = completion.choices[0]?.message?.content || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        briefData = JSON.parse(text);
      } catch (err) {
        console.error('Error generating brief via OpenRouter fallback:', err);
      }
    }

    // 6. Hardcoded fallback mock brief if both keys are missing or API calls failed
    if (!briefData) {
      console.log('Using static fallback brief data due to missing API keys');
      if (card === 'priority') {
        briefData = {
          priorityItems: [
            {
              id: 'priority-1',
              source: 'whatsapp',
              title: 'Marketing Campaign Draft',
              time: 'Just now',
              description: 'Alice requested the draft proposal for the marketing campaign.',
              priority: 'High'
            },
            {
              id: 'priority-2',
              source: 'gmail',
              title: 'UI Contrast Feedback',
              time: '1h ago',
              description: 'Sarah requested card layout updates to support HSL theme colors.',
              priority: 'Medium'
            }
          ]
        };
      } else {
        briefData = {
          importantCount: notifications.length,
          priorityCount: 2,
          followUpsCount: 1,
          brief: notifications.slice(0, 3).map((n, idx) => ({
            id: `fallback-${idx}`,
            source: n.source === 'system' ? 'whatsapp' : n.source,
            iconName: n.source === 'gmail' ? 'mail' : (n.source === 'outlook' ? 'calendar' : (n.source === 'telegram' ? 'send' : 'message-square')),
            summary: n.text.slice(0, 55) + (n.text.length > 55 ? '...' : ''),
            timestamp: 'Just now'
          }))
        };
      }
    }

    // Save generated brief to database cache
    const { error: upsertError } = await insforge.database
      .from('dashboard_briefs')
      .upsert([
        {
          user_id: userId,
          card_type: card,
          brief_data: briefData,
          updated_at: new Date().toISOString()
        }
      ]);

    if (upsertError) {
      console.error('Error saving brief to database cache:', upsertError);
    }

    return NextResponse.json({ success: true, ...briefData });
  } catch (err: any) {
    console.error('Dashboard brief endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
