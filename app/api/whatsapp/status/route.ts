import { NextResponse } from 'next/server';
import { getWhatsAppStatus } from '../../../lib/whatsapp-manager';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const statusInfo = await getWhatsAppStatus(userId);
    return NextResponse.json(statusInfo);
  } catch (err: any) {
    console.error('Status route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
