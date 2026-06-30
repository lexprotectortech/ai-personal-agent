import { NextResponse } from 'next/server';
import { whatsappConnections } from '../../../lib/whatsapp-manager';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { recipient, messageText, source } = await request.json();

    if (!recipient || !messageText || !source) {
      return NextResponse.json({ error: 'Missing required fields: recipient, messageText, and source are required.' }, { status: 400 });
    }

    console.log(`[Send Message] User: ${userId}, Platform: ${source}, To: ${recipient}, Text length: ${messageText.length}`);

    // --- WhatsApp Real Dispatch ---
    if (source === 'whatsapp') {
      const conn = whatsappConnections[userId];
      if (conn && conn.status === 'connected' && !conn.isSimulated && conn.sock) {
        try {
          // Format recipient to standard WhatsApp JID if it is a phone number
          let jid = recipient;
          if (!jid.includes('@')) {
            const cleanPhone = jid.replace(/[^0-9]/g, '');
            jid = `${cleanPhone}@s.whatsapp.net`;
          }

          await conn.sock.sendMessage(jid, { text: messageText });
          console.log(`[Send Message] Sent real WhatsApp message to: ${jid}`);
          
          return NextResponse.json({ 
            success: true, 
            message: 'WhatsApp message sent successfully via live socket.',
            recipient: jid 
          });
        } catch (err: any) {
          console.error('[Send Message] Failed to send real WhatsApp message:', err);
          return NextResponse.json({ error: `WhatsApp socket error: ${err.message}` }, { status: 500 });
        }
      } else {
        console.log(`[Send Message] Simulated WhatsApp message sent (no live socket).`);
        return NextResponse.json({ 
          success: true, 
          message: 'WhatsApp message sent (Simulated Mode).',
          recipient 
        });
      }
    }

    // --- Gmail, Telegram, Outlook (Simulated) ---
    console.log(`[Send Message] Simulated ${source} message sent.`);
    return NextResponse.json({
      success: true,
      message: `${source === 'gmail' || source === 'outlook' ? 'Email' : 'Message'} sent successfully (Simulated Mode).`,
      recipient
    });

  } catch (err: any) {
    console.error('Send message endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
