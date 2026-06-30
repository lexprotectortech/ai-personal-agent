import { NextResponse } from 'next/server';
import { disconnectWhatsApp } from '../../../lib/whatsapp-manager';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    await disconnectWhatsApp(userId);
    return NextResponse.json({ success: true, status: 'disconnected' });
  } catch (err: any) {
    console.error('Disconnect route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
