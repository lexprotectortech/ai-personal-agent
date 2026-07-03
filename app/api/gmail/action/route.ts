import { NextResponse } from 'next/server';
import {
  listGmailThreads,
  getGmailThread,
  searchGmailEmailsWithQuery,
  createGmailDraft,
  sendGmailEmail,
  applyGmailLabel,
  listGmailLabels,
  fetchRecentEmails,
} from '../../../lib/gmail-api';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { action, params } = await request.json();
    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    let result: any;

    switch (action) {
      case 'gmail_list_threads': {
        const limit = parseInt(params?.limit || '10', 10);
        const query = params?.query || '';
        const threads = await listGmailThreads(userId, limit, query);
        result = { threads, count: threads.length };
        break;
      }

      case 'gmail_get_thread': {
        const threadId = params?.threadId;
        if (!threadId) {
          return NextResponse.json({ error: 'Missing threadId parameter' }, { status: 400 });
        }
        const thread = await getGmailThread(userId, threadId);
        result = { thread };
        break;
      }

      case 'gmail_search_emails': {
        const query = params?.query;
        if (!query) {
          return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }
        const limit = parseInt(params?.limit || '10', 10);
        const emails = await searchGmailEmailsWithQuery(userId, query, limit);
        result = { emails, count: emails.length };
        break;
      }

      case 'gmail_create_draft': {
        const { threadId, body, recipient, subject } = params || {};
        if (!body) {
          return NextResponse.json({ error: 'Missing body parameter' }, { status: 400 });
        }
        const success = await createGmailDraft(userId, threadId, body, recipient, subject);
        result = { success, message: success ? 'Draft created successfully' : 'Failed to create draft' };
        break;
      }

      case 'gmail_send_email': {
        const { to, subject, body } = params || {};
        if (!to || !subject || !body) {
          return NextResponse.json({ error: 'Missing required parameters: to, subject, body' }, { status: 400 });
        }
        result = await sendGmailEmail(userId, to, subject, body);
        break;
      }

      case 'gmail_apply_label': {
        const { threadId, labelId, labelAction } = params || {};
        if (!threadId || !labelId) {
          return NextResponse.json({ error: 'Missing required parameters: threadId, labelId' }, { status: 400 });
        }
        result = await applyGmailLabel(userId, threadId, labelId, labelAction || 'add');
        break;
      }

      case 'gmail_list_labels': {
        const labels = await listGmailLabels(userId);
        result = { labels, count: labels.length };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Gmail Action API] Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: err.message?.includes('not connected') || err.message?.includes('reconnect') ? 401 : 500 }
    );
  }
}
