import { NextResponse } from 'next/server';
import { fetchRecentEmails } from '../../../lib/gmail-api';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    // Support filter query param: 'unread' or 'all' (default: 'all')
    const url = new URL(request.url);
    const filter = (url.searchParams.get('filter') as 'unread' | 'all') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const emails = await fetchRecentEmails(userId, limit, filter);
    return NextResponse.json({ success: true, emails });
  } catch (err: any) {
    console.error('[Gmail Emails API] Exception:', err);
    // Surface the descriptive error message from gmail-api.ts
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch emails' },
      { status: err.message?.includes('not connected') || err.message?.includes('reconnect') ? 401 : 500 }
    );
  }
}
