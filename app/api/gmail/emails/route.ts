import { NextResponse } from 'next/server';
import { fetchRecentEmails } from '../../../lib/gmail-api';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const emails = await fetchRecentEmails(userId, 10);
    return NextResponse.json({ success: true, emails });
  } catch (err: any) {
    console.error('[Gmail Emails API] Exception:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
