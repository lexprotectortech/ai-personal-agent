import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { insforge } from '../../lib/insforge';
import { 
  whatsappConnections, 
  getMessageSender, 
  getMessageText 
} from '../../lib/whatsapp-manager';

// System prompt to instruct the AI agent on behavior, context-gathering, and suggestion tags.
const SYSTEM_PROMPT = `
You are OmniSync AI, a powerful, context-aware personal assistant agent. You help the user manage their tasks, communications, and schedules across connected apps (Gmail, WhatsApp, Slack, Outlook, Discord, LinkedIn, Telegram, etc.).
You have tools to fetch real-time or simulated data from these channels. Always call the appropriate tool when the user asks about their messages, emails, calendar events, notifications, or today's brief, and use that context to answer.

Formatting Rules:
1. Be concise, professional, and clear.
2. Render rich output using markdown:
   - Use headings (###) for sections.
   - Use bullet points or numbered lists.
   - Use bold (**text**) and italic (*text*) where appropriate.
   - Use markdown tables for displaying lists of emails, events, or messages.
   - Use code blocks for technical details.
   - Use links where relevant.
3. If you reference Gmail, WhatsApp, Slack, Outlook, Discord, LinkedIn, or Telegram, write their names normally (e.g. WhatsApp, Gmail) and the frontend will display appropriate logos.
4. At the very end of your response, you MUST generate 2 to 3 helpful context-aware quick reply suggestions. Format each suggestion on a new line at the very end of your message wrapped exactly as:
[Suggest: Clickable suggestion text here]

Ensure there is a double newline before your suggestions list, and write nothing else after the suggestions list.
`;

// Helper functions for mock data
function getMockGmailNotifications() {
  return {
    success: true,
    emails: [
      { 
        id: 'gm-1', 
        sender: 'Sarah Jenkins (Product)', 
        subject: 'UI feedback on Personal AI Agent dashboard', 
        text: 'Urgent: UI feedback on Personal AI Agent dashboard. We need to adjust card layouts to support HSL tailwind colors. Sync today at 4 PM.', 
        timestamp: Math.floor(Date.now() / 1000) - 3600 
      },
      { 
        id: 'gm-2', 
        sender: 'Google Cloud Billing', 
        subject: 'Your Google Cloud invoice is now available', 
        text: 'Your Google Cloud invoice is now available for review. Payment due in 15 days.', 
        timestamp: Math.floor(Date.now() / 1000) - 7200 
      },
      {
        id: 'gm-3',
        sender: 'David Harris (HR)',
        subject: 'Updated Remote Work Policy Q3',
        text: 'Hello Team, please find attached the revised guidelines for remote work schedules. Acknowledgment is required by end of week.',
        timestamp: Math.floor(Date.now() / 1000) - 14400
      }
    ]
  };
}

function getMockOutlookEvents() {
  return {
    success: true,
    events: [
      { 
        id: 'ev-1',
        title: 'Q3 Product Roadmap Alignment', 
        time: 'Tomorrow at 2:00 PM', 
        organizer: 'CEO', 
        duration: '1h', 
        description: 'Roadmap auditing and prioritization. Note: overlaps with design critique.' 
      },
      { 
        id: 'ev-2',
        title: 'Weekly Design Critique', 
        time: 'Tomorrow at 2:30 PM', 
        organizer: 'Design Lead', 
        duration: '30m', 
        description: 'Review new design components and spacing guidelines.' 
      },
      {
        id: 'ev-3',
        title: 'Marketing Synch & Review',
        time: 'Friday at 11:00 AM',
        organizer: 'Alice (Marketing)',
        duration: '1h',
        description: 'Finalize the draft proposal and budget spreadsheet for the Q3 campaign.'
      }
    ]
  };
}

function getMockTelegramMessages() {
  return {
    success: true,
    messages: [
      { 
        id: 'tg-1',
        sender: 'Solana Developer Chat', 
        text: '#announcement Node operators must patch to version 1.18.15. Mainnet upgrade tonight at 23:00 UTC.', 
        timestamp: Math.floor(Date.now() / 1000) - 10800 
      },
      {
        id: 'tg-2',
        sender: 'Telegram Channel Bot',
        text: 'Crypto Market Alert: BTC crossed $95,000 threshold. Market volume increased by 14%.',
        timestamp: Math.floor(Date.now() / 1000) - 18000
      }
    ]
  };
}

function getMockSlackMessages() {
  return {
    success: true,
    channels: [
      { id: 'sl-1', name: '#general', lastMessage: 'Let\'s make sure we post the latest project release notes today.' },
      { id: 'sl-2', name: '#alerts', lastMessage: '[Alert] Production database latency spiked to 250ms.' },
      { id: 'sl-3', name: '#marketing', lastMessage: 'Alice: Draft proposal link shared in drive. Check it out.' }
    ]
  };
}

// Tool declarations for the OpenAI client
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_connected_apps',
      description: 'Get statuses of user integrations (Gmail, WhatsApp, Outlook, Telegram, Slack, etc.) to see which ones are linked.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_whatsapp_messages',
      description: 'Retrieve recent WhatsApp messages across active chats.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of messages to retrieve' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_whatsapp_chat_history',
      description: 'Fetch detailed message history/thread for a specific WhatsApp JID or phone number.',
      parameters: {
        type: 'object',
        properties: {
          jid: { type: 'string', description: 'WhatsApp contact JID (e.g. 919876543210@s.whatsapp.net) or phone number' },
          limit: { type: 'number', description: 'Number of history messages to fetch (default: 20)' }
        },
        required: ['jid']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: 'Send a WhatsApp text message to a specific contact JID or phone number.',
      parameters: {
        type: 'object',
        properties: {
          jid: { type: 'string', description: 'WhatsApp contact JID (e.g. 919876543210@s.whatsapp.net) or phone number' },
          message: { type: 'string', description: 'The text message content to send' }
        },
        required: ['jid', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_gmail_notifications',
      description: 'Retrieve recent Gmail emails/notifications from the inbox (sender, subject, summary, timestamp).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_gmail_draft',
      description: 'Create a draft response to an email thread or draft a new email with AI suggestions.',
      parameters: {
        type: 'object',
        properties: {
          recipient: { type: 'string', description: 'Email address of the recipient' },
          subject: { type: 'string', description: 'Subject of the email' },
          body: { type: 'string', description: 'Body text content of the email draft' }
        },
        required: ['recipient', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_outlook_calendar_events',
      description: 'Retrieve upcoming calendar events and meetings from Outlook calendar.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_today_brief',
      description: 'Retrieve Today\'s Executive Brief, counts, and summaries from connected platforms.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_telegram_messages',
      description: 'Fetch recent messages and updates from Telegram channel bot.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_slack_messages',
      description: 'Fetch recent channels list and messages from Slack workspace.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages body' }, { status: 400 });
    }

    // Determine API credentials
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    let openai: OpenAI;
    let modelName = 'gemini-3.1-flash-lite';

    if (openRouterApiKey) {
      openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://personal-agent.local',
          'X-Title': 'Personal AI Agent',
        }
      });
      modelName = 'google/gemini-3.1-flash-lite';
    } else if (geminiApiKey) {
      openai = new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: geminiApiKey,
      });
      modelName = 'gemini-3.1-flash-lite';
    } else {
      return NextResponse.json({ error: 'No AI service API keys configured on backend (.env).' }, { status: 500 });
    }

    // Prepare execution messages history
    const responseMessages: any[] = [...messages];
    let isToolCallPending = true;
    let iterations = 0;
    const maxIterations = 5;

    // Turn-based tool calling loop
    while (isToolCallPending && iterations < maxIterations) {
      iterations++;

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...responseMessages
        ],
        tools: TOOLS,
        tool_choice: 'auto'
      });

      const message = completion.choices[0]?.message;
      if (!message) break;

      if (message.tool_calls && message.tool_calls.length > 0) {
        responseMessages.push(message);

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          let toolResult;

          console.log(`AI Agent executing tool: ${toolName} with args:`, toolArgs);

          try {
            switch (toolName) {
              case 'fetch_connected_apps': {
                const { data } = await insforge.database
                  .from('user_integrations')
                  .select('platform_id, is_connected')
                  .eq('user_id', userId);
                toolResult = { success: true, integrations: data || [] };
                break;
              }
              case 'fetch_whatsapp_messages': {
                const conn = whatsappConnections[userId];
                if (conn && conn.status === 'connected' && conn.store && !conn.isSimulated) {
                  const chats = conn.store.chats.all();
                  const results = [];
                  for (const chat of chats) {
                    const msgs = conn.store.messages[chat.id];
                    const rawMsgs = Array.isArray(msgs) ? msgs : (msgs?.toArray ? msgs.toArray() : []);
                    const lastMsg = rawMsgs[rawMsgs.length - 1];
                    if (lastMsg) {
                      results.push({
                        chatId: chat.id,
                        chatName: chat.name || getMessageSender(lastMsg, conn.store),
                        sender: getMessageSender(lastMsg, conn.store),
                        text: getMessageText(lastMsg),
                        timestamp: lastMsg.messageTimestamp
                      });
                    }
                  }
                  toolResult = { success: true, messages: results.slice(0, toolArgs.limit || 20) };
                } else {
                  // simulated fallbacks
                  toolResult = {
                    success: true,
                    messages: [
                      { chatId: '919876543210@s.whatsapp.net', chatName: 'Alice (Marketing)', sender: 'Alice', text: 'Hey, did you finish the draft proposal for the marketing campaign? #urgent', timestamp: Math.floor(Date.now() / 1000) },
                      { chatId: '918765432109@s.whatsapp.net', chatName: 'Bob (Eng)', sender: 'Bob', text: 'Are we still on for the sync tomorrow at 10 AM?', timestamp: Math.floor(Date.now() / 1000) - 300 },
                      { chatId: '12036302492109@g.us', chatName: 'Project Alpha Group', sender: 'Charlie', text: '#task Let\'s finalize the contract terms by Friday.', timestamp: Math.floor(Date.now() / 1000) - 1800 }
                    ].slice(0, toolArgs.limit || 20)
                  };
                }
                break;
              }
              case 'read_whatsapp_chat_history': {
                const conn = whatsappConnections[userId];
                const limit = toolArgs.limit || 20;
                if (conn && conn.status === 'connected' && conn.store && !conn.isSimulated) {
                  const msgs = conn.store.messages[toolArgs.jid] || [];
                  const formatted = msgs.slice(-limit).map((m: any) => ({
                    sender: getMessageSender(m, conn.store),
                    text: getMessageText(m),
                    timestamp: m.messageTimestamp,
                    fromMe: !!m.key?.fromMe
                  }));
                  toolResult = { success: true, messages: formatted };
                } else {
                  toolResult = {
                    success: true,
                    messages: [
                      { sender: 'Alice', text: 'Hi! Just checking in.', timestamp: Math.floor(Date.now() / 1000) - 7200, fromMe: false },
                      { sender: 'You', text: 'Hey Alice! Yes, I am working on the draft.', timestamp: Math.floor(Date.now() / 1000) - 3600, fromMe: true },
                      { sender: 'Alice', text: 'Great, thanks! Please add the budget section.', timestamp: Math.floor(Date.now() / 1000) - 1800, fromMe: false },
                      { sender: 'Alice', text: 'Hey, did you finish the draft proposal for the marketing campaign? #urgent', timestamp: Math.floor(Date.now() / 1000) - 60, fromMe: false }
                    ].slice(-limit)
                  };
                }
                break;
              }
              case 'send_whatsapp_message': {
                const conn = whatsappConnections[userId];
                if (conn && conn.status === 'connected' && conn.sock && !conn.isSimulated) {
                  const cleanJid = toolArgs.jid.includes('@') ? toolArgs.jid : `${toolArgs.jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                  await conn.sock.sendMessage(cleanJid, { text: toolArgs.message });
                  toolResult = { success: true, sent: true };
                } else {
                  toolResult = { success: true, sent: true, note: 'Simulated dispatch successful' };
                }
                break;
              }
              case 'fetch_gmail_notifications': {
                toolResult = getMockGmailNotifications();
                break;
              }
              case 'create_gmail_draft': {
                toolResult = { success: true, draftCreated: true, recipient: toolArgs.recipient, subject: toolArgs.subject };
                break;
              }
              case 'fetch_outlook_calendar_events': {
                toolResult = getMockOutlookEvents();
                break;
              }
              case 'fetch_today_brief': {
                const { data } = await insforge.database
                  .from('dashboard_briefs')
                  .select('brief_data')
                  .eq('user_id', userId)
                  .eq('card_type', 'summary')
                  .maybeSingle();
                toolResult = { success: true, brief: data?.brief_data || null };
                break;
              }
              case 'fetch_telegram_messages': {
                toolResult = getMockTelegramMessages();
                break;
              }
              case 'fetch_slack_messages': {
                toolResult = getMockSlackMessages();
                break;
              }
              default:
                toolResult = { error: `Tool ${toolName} not supported.` };
            }
          } catch (err: any) {
            console.error(`Error executing tool ${toolName}:`, err);
            toolResult = { error: err.message || 'Tool execution failed' };
          }

          responseMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(toolResult)
          });
        }
      } else {
        isToolCallPending = false;

        // Perform final streaming completion
        const stream = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...responseMessages
          ],
          stream: true
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
          }
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }
    }

    // If max iterations reached without resolving, return fallback text
    return NextResponse.json({ error: 'Tool execution loops exceeded maximum limit.' }, { status: 500 });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
