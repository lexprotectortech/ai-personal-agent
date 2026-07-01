import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { insforge } from '../../../../lib/insforge';

// Helper to generate secure, deterministic password for the phone number
function generatePhonePassword(phone: string): string {
  const secret = process.env.SENT_DM_API_KEY || 'default-fallback-secret-for-phone-auth';
  return createHash('sha256')
    .update(`${phone}:${secret}`)
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Missing phone or code' }, { status: 400 });
    }

    // Clean and normalize phone number: keep '+' if present, strip other non-digits
    const cleanPhone = phone.startsWith('+')
      ? '+' + phone.substring(1).replace(/\D/g, '')
      : phone.replace(/\D/g, '');

    // Fetch the OTP from database
    const { data: record, error: fetchError } = await insforge.database
      .from('phone_otps')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (fetchError) {
      console.error('[Verify OTP] Database error fetching OTP:', fetchError);
      return NextResponse.json({ error: 'Database error. Verification failed.' }, { status: 500 });
    }

    if (!record) {
      return NextResponse.json({ error: 'OTP not found. Please request a new code.' }, { status: 400 });
    }

    // Check code match
    if (record.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    // Check expiration
    const expiresAt = new Date(record.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Delete expired OTP
      await insforge.database.from('phone_otps').delete().eq('phone', cleanPhone);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Success: Delete the OTP so it cannot be reused
    await insforge.database
      .from('phone_otps')
      .delete()
      .eq('phone', cleanPhone);

    // Generate secure deterministic credentials
    const email = `phone_${cleanPhone}@phone.local`;
    const tempPassword = generatePhonePassword(cleanPhone);

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully.',
      email,
      tempPassword
    });

  } catch (error: any) {
    console.error('[Verify OTP] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
