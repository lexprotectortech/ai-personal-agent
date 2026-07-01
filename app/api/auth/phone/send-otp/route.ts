import { NextResponse } from 'next/server';
import { insforge } from '../../../../lib/insforge';
import SentDm from '@sentdm/sentdm';

export async function POST(request: Request) {
  try {
    const { phone, method } = await request.json();

    if (!phone || !method) {
      return NextResponse.json({ error: 'Missing phone or method' }, { status: 400 });
    }

    if (method !== 'sms' && method !== 'whatsapp') {
      return NextResponse.json({ error: 'Invalid verification method. Must be sms or whatsapp.' }, { status: 400 });
    }

    // Clean and normalize phone number: keep '+' if present, strip other non-digits
    const cleanPhone = phone.startsWith('+')
      ? '+' + phone.substring(1).replace(/\D/g, '')
      : phone.replace(/\D/g, '');

    // Generate a 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Save/Upsert OTP code in database using InsForge client
    const { error: deleteError } = await insforge.database
      .from('phone_otps')
      .delete()
      .eq('phone', cleanPhone);

    if (deleteError) {
      console.error('[Send OTP] Error deleting existing OTP:', deleteError);
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }

    const { error: insertError } = await insforge.database
      .from('phone_otps')
      .insert({
        phone: cleanPhone,
        code: otpCode,
        expires_at: expiresAt,
        verification_method: method
      });

    if (insertError) {
      console.error('[Send OTP] Error inserting new OTP:', insertError);
      return NextResponse.json({ error: 'Database error. Failed to store OTP.' }, { status: 500 });
    }

    // Initialize Sent.dm client
    const apiKey = process.env.SENT_DM_API_KEY;
    const templateId = process.env.SENT_DM_TEMPLATE_ID || 'e9eae6e7-1ec8-46ba-80da-fceb00723c0a';

    if (!apiKey) {
      console.error('[Send OTP] Missing SENT_DM_API_KEY env var.');
      return NextResponse.json({ error: 'Sent.dm API Key is not configured.' }, { status: 500 });
    }

    const sentdm = new SentDm({ apiKey });

    console.log(`[Send OTP] Sending ${method} OTP to ${cleanPhone} using template ${templateId}`);

    const response = await sentdm.messages.send({
      to: [cleanPhone],
      template: {
        id: templateId,
        parameters: {
          var_1: otpCode
        }
      },
      channel: [method]
    });

    console.log('[Send OTP] Sent.dm response:', response);

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });

  } catch (error: any) {
    console.error('[Send OTP] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
