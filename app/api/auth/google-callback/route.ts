import { NextResponse } from 'next/server';
import { insforge } from '../../../lib/insforge';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { code, redirectUri } = await request.json();
    if (!code || !redirectUri) {
      return NextResponse.json({ error: 'Missing code or redirectUri' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'OAuth credentials not configured on server' }, { status: 500 });
    }

    // Exchange authorization code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Google Callback API] Token exchange failed:', errText);
      return NextResponse.json({ error: 'Google OAuth token exchange failed', details: errText }, { status: 400 });
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_in } = data;
    const expires_at = Date.now() + (expires_in || 3600) * 1000;

    // Check if configuration row already exists in user_integrations
    const { data: existingRow, error: checkError } = await insforge.database
      .from('user_integrations')
      .select('id, settings')
      .eq('user_id', userId)
      .eq('platform_id', 'gmail')
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const updatedSettings = {
      ...(existingRow?.settings || {}),
      access_token,
      expires_at,
    };
    if (refresh_token) {
      updatedSettings.refresh_token = refresh_token;
    }

    if (existingRow) {
      // Row exists: update
      const { error: updateError } = await insforge.database
        .from('user_integrations')
        .update({
          is_connected: true,
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRow.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Row does not exist: insert
      const { error: insertError } = await insforge.database
        .from('user_integrations')
        .insert({
          user_id: userId,
          platform_id: 'gmail',
          is_connected: true,
          settings: updatedSettings,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    console.log(`[Google Callback API] Successfully authorized Gmail integration for user: ${userId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Google Callback API] Exception:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
