import { insforge } from './insforge';

export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: number;
}

/**
 * Retrieves and automatically refreshes the Google access token for a user.
 */
export async function getGmailAccessToken(userId: string): Promise<string | null> {
  try {
    // 1. Fetch integration row from public database
    const { data: row, error } = await insforge.database
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('platform_id', 'gmail')
      .maybeSingle();

    if (error || !row || !row.is_connected) {
      console.log(`[Gmail API] Integration not connected or not found for user: ${userId}`);
      return null;
    }

    const settings = row.settings || {};
    const { access_token, refresh_token, expires_at } = settings;

    if (!access_token) {
      console.log(`[Gmail API] No access token found in settings for user: ${userId}`);
      return null;
    }

    // 2. Check if token is expired (with 5-minute buffer)
    const buffer = 5 * 60 * 1000;
    if (expires_at && Date.now() < expires_at - buffer) {
      return access_token;
    }

    if (!refresh_token) {
      console.log(`[Gmail API] Access token expired and no refresh token available for user: ${userId}`);
      return access_token; // Try using it anyway
    }

    // 3. Refresh access token
    console.log(`[Gmail API] Token expired. Attempting refresh for user: ${userId}`);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[Gmail API] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.');
      return access_token;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gmail API] Failed to refresh Google access token: ${errText}`);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    // Update settings in database
    const updatedSettings = {
      ...settings,
      access_token: newAccessToken,
      expires_at: newExpiresAt,
    };

    const { error: updateError } = await insforge.database
      .from('user_integrations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      console.error(`[Gmail API] Failed to save refreshed token in database: ${updateError.message}`);
    }

    return newAccessToken;
  } catch (err) {
    console.error(`[Gmail API] Exception in getGmailAccessToken for user ${userId}:`, err);
    return null;
  }
}

/**
 * Fetches recent unread emails from the user's Gmail inbox.
 */
export async function fetchRecentEmails(userId: string, limit: number = 5): Promise<GmailEmail[]> {
  const token = await getGmailAccessToken(userId);
  if (!token) return [];

  try {
    // 1. Fetch message list
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error(`[Gmail API] List messages failed: ${errText}`);
      return [];
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    if (messages.length === 0) return [];

    // 2. Fetch full detail for each message
    const emailPromises = messages.map(async (msg: any) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return null;

        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
        
        // Parse email body (text/plain preferred)
        let body = '';
        if (detail.payload?.body?.data) {
          body = Buffer.from(detail.payload.body.data, 'base64').toString('utf8');
        } else if (detail.payload?.parts) {
          // Look for text/plain part
          const part = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain');
          if (part?.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf8');
          }
        }

        return {
          id: detail.id,
          threadId: detail.threadId,
          from: fromHeader,
          subject: subjectHeader,
          snippet: detail.snippet || '',
          body: body || detail.snippet || '',
          timestamp: Math.floor(parseInt(detail.internalDate) / 1000),
        };
      } catch (err) {
        console.error(`[Gmail API] Failed to fetch message detail for ${msg.id}:`, err);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    return results.filter((email): email is GmailEmail => email !== null);
  } catch (err) {
    console.error(`[Gmail API] Exception fetching emails for user ${userId}:`, err);
    return [];
  }
}

/**
 * Creates a draft response or a new draft email inside the user's Gmail inbox.
 */
export async function createGmailDraft(
  userId: string,
  threadId: string | undefined | null,
  replyBody: string,
  recipient?: string,
  subject?: string
): Promise<boolean> {
  const token = await getGmailAccessToken(userId);
  if (!token) return false;

  try {
    let to = recipient || '';
    let emailSubject = subject || 'No Subject';
    let messageId = '';
    let parentThreadId = threadId || undefined;

    if (threadId) {
      // 1. Fetch thread details to locate Message-ID and Subject for linking
      const threadRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (threadRes.ok) {
        const thread = await threadRes.json();
        const lastMessage = thread.messages?.[thread.messages.length - 1];
        if (lastMessage) {
          const headers = lastMessage.payload?.headers || [];
          messageId = headers.find((h: any) => h.name.toLowerCase() === 'message-id')?.value || '';
          const originalSubject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Re: Thread';
          emailSubject = originalSubject.toLowerCase().startsWith('re:') ? originalSubject : 'Re: ' + originalSubject;
          
          // Get the sender of the original message to reply to
          const fromVal = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value;
          if (fromVal) {
            to = fromVal;
          }
        }
      } else {
        console.error(`[Gmail API] Failed to fetch thread ${threadId} details, falling back to basic draft.`);
      }
    }

    // Construct raw MIME email headers
    const emailLines = [
      `To: ${to}`,
      `Subject: ${emailSubject}`,
    ];

    if (messageId) {
      emailLines.push(`In-Reply-To: ${messageId}`);
      emailLines.push(`References: ${messageId}`);
    }

    emailLines.push('Content-Type: text/plain; charset="UTF-8"');
    emailLines.push('');
    emailLines.push(replyBody);

    const rawMessage = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 2. POST to Gmail drafts endpoint
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            threadId: parentThreadId,
            raw: rawMessage,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gmail API] Draft creation failed: ${errText}`);
      return false;
    }

    console.log(`[Gmail API] Successfully created draft for user ${userId} (threadId: ${threadId || 'none'})`);
    return true;
  } catch (err) {
    console.error(`[Gmail API] Exception in createGmailDraft for user ${userId}:`, err);
    return false;
  }
}
