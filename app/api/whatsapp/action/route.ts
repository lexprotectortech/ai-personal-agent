import { NextResponse } from 'next/server';
import { 
  whatsappConnections, 
  getMessageSender, 
  getMessageText 
} from '../../../lib/whatsapp-manager';
import OpenAI from 'openai';

function formatJid(jidOrPhone: string): string {
  if (!jidOrPhone) return '';
  const trimmed = jidOrPhone.trim();
  if (trimmed.includes('@')) return trimmed;
  const cleanPhone = trimmed.replace(/[^0-9]/g, '');
  return `${cleanPhone}@s.whatsapp.net`;
}

async function handleSimulatedAction(action: string, params: any) {
  switch (action) {
    case 'wa_fetch_recent_messages': {
      return NextResponse.json({
        success: true,
        messages: [
          {
            chatId: '919876543210@s.whatsapp.net',
            chatName: 'Alice (Marketing)',
            sender: 'Alice',
            text: 'Hey, did you finish the draft proposal for the marketing campaign? #urgent',
            timestamp: Math.floor(Date.now() / 1000)
          },
          {
            chatId: '918765432109@s.whatsapp.net',
            chatName: 'Bob (Eng)',
            sender: 'Bob',
            text: 'Are we still on for the sync tomorrow at 10 AM?',
            timestamp: Math.floor(Date.now() / 1000) - 300
          },
          {
            chatId: '12036302492109@g.us',
            chatName: 'Project Alpha Group',
            sender: 'Charlie',
            text: '#task Let\'s finalize the contract terms by Friday.',
            timestamp: Math.floor(Date.now() / 1000) - 1800
          }
        ]
      });
    }

    case 'wa_read_chat_history':
    case 'wa_fetch_group_messages': {
      const limit = params.limit ? parseInt(params.limit) : 20;
      const mockHistory = [
        { id: 'MOCK_1', sender: 'Alice', text: 'Hi! Just checking in.', timestamp: Math.floor(Date.now() / 1000) - 7200, fromMe: false },
        { id: 'MOCK_2', sender: 'You', text: 'Hey Alice! Yes, I am working on the draft.', timestamp: Math.floor(Date.now() / 1000) - 3600, fromMe: true },
        { id: 'MOCK_3', sender: 'Alice', text: 'Great, thanks! Please add the budget section.', timestamp: Math.floor(Date.now() / 1000) - 1800, fromMe: false },
        { id: 'MOCK_4', sender: 'Alice', text: 'Hey, did you finish the draft proposal for the marketing campaign? #urgent', timestamp: Math.floor(Date.now() / 1000) - 60, fromMe: false }
      ];
      return NextResponse.json({ success: true, messages: mockHistory.slice(-limit) });
    }

    case 'wa_send_message':
    case 'wa_send_group_messages': {
      return NextResponse.json({
        success: true,
        response: {
          key: { id: 'MOCK_SEND_' + Math.random().toString(36).substring(2, 9) },
          messageTimestamp: Math.floor(Date.now() / 1000),
          status: 'SERVER_ACK'
        }
      });
    }

    case 'wa_search_chats': {
      const query = (params.query || '').toLowerCase();
      const mockChats = [
        { id: '919876543210@s.whatsapp.net', name: 'Alice (Marketing)' },
        { id: '918765432109@s.whatsapp.net', name: 'Bob (Eng)' },
        { id: '12036302492109@g.us', name: 'Project Alpha Group' }
      ].filter(c => c.name.toLowerCase().includes(query) || c.id.includes(query));
      return NextResponse.json({ success: true, chats: mockChats });
    }

    case 'wa_list_groups': {
      return NextResponse.json({
        success: true,
        groups: [
          { jid: '12036302492109@g.us', name: 'Project Alpha Group' },
          { jid: '12036302492110@g.us', name: 'Design Team Brainstorm' }
        ]
      });
    }

    case 'wa_get_contact_details': {
      const targetJid = formatJid(params.jid);
      return NextResponse.json({
        success: true,
        contact: {
          jid: targetJid,
          name: targetJid.startsWith('919876543210') ? 'Alice (Marketing)' : (targetJid.startsWith('918765432109') ? 'Bob (Eng)' : 'Simulated Contact'),
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        }
      });
    }

    case 'wa_summarize_conversations': {
      const apiKey = process.env.OPENROUTER_API_KEY;
      const mockHistoryStr = `Alice: Hi! Just checking in.\nYou: Hey Alice! Yes, I am working on the draft.\nAlice: Great, thanks! Please add the budget section.\nAlice: Hey, did you finish the draft proposal for the marketing campaign? #urgent`;
      
      if (!apiKey) {
        return NextResponse.json({
          success: true,
          summary: 'Alice requested an update on the marketing campaign draft proposal and asked to include the budget section. She marked this query as urgent.'
        });
      }

      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://personal-agent.local',
          'X-Title': 'Personal AI Agent',
        }
      });

      const completion = await openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional assistant summarizing WhatsApp chat conversations. Summarize the following thread, highlighting key points, decisions, and action items. Keep the summary concise, structured, and under 150 words.' 
          },
          { role: 'user', content: mockHistoryStr }
        ]
      });

      const summary = completion.choices[0]?.message?.content || 'No summary generated.';
      return NextResponse.json({ success: true, summary });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const conn = whatsappConnections[userId];
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json({ 
        error: 'WhatsApp is not connected. Please connect WhatsApp from the integrations tab before executing actions.' 
      }, { status: 400 });
    }

    const { action, params = {} } = await request.json().catch(() => ({}));
    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (conn.isSimulated) {
      return handleSimulatedAction(action, params);
    }

    switch (action) {
      case 'wa_fetch_recent_messages': {
        const chats = conn.store.chats.all();
        const results: any[] = [];
        for (const chat of chats) {
          const msgs = conn.store.messages[chat.id];
          const rawMsgs = Array.isArray(msgs) ? msgs : (msgs?.toArray ? msgs.toArray() : []);
          const lastMsg = rawMsgs[rawMsgs.length - 1];
          if (lastMsg) {
            results.push({
              chatId: chat.id,
              chatName: chat.name || chat.id.split('@')[0],
              sender: getMessageSender(lastMsg, conn.store),
              text: getMessageText(lastMsg),
              timestamp: lastMsg.messageTimestamp
            });
          }
        }
        results.sort((a, b) => b.timestamp - a.timestamp);
        return NextResponse.json({ success: true, messages: results.slice(0, 20) });
      }

      case 'wa_read_chat_history':
      case 'wa_fetch_group_messages': {
        const targetJid = formatJid(params.jid);
        if (!targetJid) {
          return NextResponse.json({ error: 'Missing parameter: jid' }, { status: 400 });
        }
        const limit = params.limit ? parseInt(params.limit) : 20;
        const msgs = conn.store.messages[targetJid];
        const rawMsgs = Array.isArray(msgs) ? msgs : (msgs?.toArray ? msgs.toArray() : []);
        const formatted = rawMsgs.slice(-limit).map((msg: any) => ({
          id: msg.key.id,
          sender: getMessageSender(msg, conn.store),
          text: getMessageText(msg),
          timestamp: msg.messageTimestamp,
          fromMe: msg.key.fromMe
        }));
        return NextResponse.json({ success: true, messages: formatted });
      }

      case 'wa_send_message':
      case 'wa_send_group_messages': {
        const targetJid = formatJid(params.jid);
        const text = params.message;
        if (!targetJid || !text) {
          return NextResponse.json({ error: 'Missing parameters: jid or message' }, { status: 400 });
        }
        const response = await conn.sock.sendMessage(targetJid, { text });
        return NextResponse.json({ success: true, response });
      }

      case 'wa_search_chats': {
        const query = (params.query || '').toLowerCase();
        if (!query) {
          return NextResponse.json({ error: 'Missing parameter: query' }, { status: 400 });
        }
        const chats = conn.store.chats.all().filter((chat: any) => {
          const name = (chat.name || '').toLowerCase();
          const jid = chat.id.toLowerCase();
          return name.includes(query) || jid.includes(query);
        });
        return NextResponse.json({ success: true, chats });
      }

      case 'wa_list_groups': {
        const groups = conn.store.chats.all()
          .filter((chat: any) => chat.id.endsWith('@g.us'))
          .map((chat: any) => ({
            jid: chat.id,
            name: chat.name || chat.id.split('@')[0]
          }));
        return NextResponse.json({ success: true, groups });
      }

      case 'wa_get_contact_details': {
        const targetJid = formatJid(params.jid);
        if (!targetJid) {
          return NextResponse.json({ error: 'Missing parameter: jid' }, { status: 400 });
        }
        let avatarUrl = '';
        try {
          avatarUrl = await conn.sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
          // ignore error if profile pic not found
        }
        const contact = conn.store.contacts[targetJid] || {};
        return NextResponse.json({
          success: true,
          contact: {
            jid: targetJid,
            name: contact.name || contact.notify || targetJid.split('@')[0],
            avatarUrl
          }
        });
      }

      case 'wa_summarize_conversations': {
        const targetJid = formatJid(params.jid);
        if (!targetJid) {
          return NextResponse.json({ error: 'Missing parameter: jid' }, { status: 400 });
        }
        const msgs = conn.store.messages[targetJid];
        const rawMsgs = Array.isArray(msgs) ? msgs : (msgs?.toArray ? msgs.toArray() : []);
        const conversation = rawMsgs
          .slice(-30)
          .map((msg: any) => `${getMessageSender(msg, conn.store)}: ${getMessageText(msg)}`)
          .filter((text: string) => text.trim().length > 0)
          .join('\n');

        if (!conversation.trim()) {
          return NextResponse.json({ 
            success: true, 
            summary: 'No recent conversation history found with this contact to summarize.' 
          });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          const mockSummary = `[MOCK SUMMARY - Set OPENROUTER_API_KEY in .env to enable AI summaries]

This thread contains ${rawMsgs.length} recent messages.
Last message was sent by: ${rawMsgs[rawMsgs.length - 1] ? getMessageSender(rawMsgs[rawMsgs.length - 1], conn.store) : 'N/A'}
Content: "${rawMsgs[rawMsgs.length - 1] ? getMessageText(rawMsgs[rawMsgs.length - 1]) : ''}"`;
          return NextResponse.json({ success: true, summary: mockSummary });
        }

        // Call OpenRouter
        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: apiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://personal-agent.local',
            'X-Title': 'Personal AI Agent',
          }
        });

        const completion = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional assistant summarizing WhatsApp chat conversations. Summarize the following thread, highlighting key points, decisions, and action items. Keep the summary concise, structured, and under 150 words.' 
            },
            { role: 'user', content: conversation }
          ]
        });

        const summary = completion.choices[0]?.message?.content || 'No summary generated.';
        return NextResponse.json({ success: true, summary });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Action route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
