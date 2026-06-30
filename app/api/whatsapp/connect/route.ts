import { NextResponse } from 'next/server';
import { initWhatsApp, initSimulatedWhatsApp } from '../../../lib/whatsapp-manager';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { phoneNumber, simulated } = await request.json().catch(() => ({}));

    if (simulated) {
      await initSimulatedWhatsApp(userId);
      return NextResponse.json({ 
        status: 'connected', 
        isSimulated: true 
      });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    // Initialize WhatsApp connection & request pairing code
    const conn = await initWhatsApp(userId, phoneNumber, true);
    if (!conn) {
      return NextResponse.json({ error: 'Failed to initialize WhatsApp connection' }, { status: 500 });
    }

    // Wait up to 5 seconds for the pairing code to be generated in the background
    let code = conn.pairingCode;
    let attempts = 0;
    while (!code && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      code = conn.pairingCode;
      attempts++;
    }

    if (!code) {
      return NextResponse.json({ 
        status: 'connecting', 
        message: 'Pairing code is being generated, please poll status.' 
      });
    }

    return NextResponse.json({ 
      status: 'connecting', 
      pairingCode: code 
    });
  } catch (err: any) {
    console.error('Connect route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
