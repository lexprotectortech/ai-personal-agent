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

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messagesCount: number;
  messages: {
    id: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    body: string;
  }[];
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

/**
 * Retrieves and automatically refreshes the Google access token for a user.
 * Throws an error with a descriptive message if the token cannot be obtained.
 */
export async function getGmailAccessToken(userId: string): Promise<string> {
  // 1. Fetch integration row from public database
  const { data: row, error } = await insforge.database
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_id', 'gmail')
    .maybeSingle();

  if (error) {
    throw new Error(`Database error fetching Gmail integration: ${error.message}`);
  }

  if (!row || !row.is_connected) {
    throw new Error('Gmail is not connected. Please connect your Gmail account from the Integrations page.');
  }

  const settings = row.settings || {};
  const { access_token, refresh_token, expires_at } = settings;

  if (!access_token) {
    throw new Error('Gmail access token is missing. Please reconnect your Gmail account.');
  }

  // 2. Check if token is expired (with 5-minute buffer)
  const buffer = 5 * 60 * 1000;
  if (expires_at && Date.now() < expires_at - buffer) {
    return access_token;
  }

  if (!refresh_token) {
    console.warn(`[Gmail API] Access token expired and no refresh token available for user: ${userId}`);
    return access_token; // Try using it anyway — Google might still accept it
  }

  // 3. Refresh access token
  console.log(`[Gmail API] Token expired. Attempting refresh for user: ${userId}`);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Server OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured. Please check your .env.local file.');
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
    throw new Error('Gmail access token expired and refresh failed. Please reconnect your Gmail account.');
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
}

/**
 * Helper to parse email parts and extract plain text body.
 */
function extractEmailBody(payload: any): string {
  if (payload?.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload?.parts) {
    // Look for text/plain first
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plainPart?.body?.data) {
      return Buffer.from(plainPart.body.data, 'base64').toString('utf8');
    }
    // Fall back to text/html
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
      return html.replace(/<[^>]*>/g, '').trim();
    }
    // Check nested parts (multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

/**
 * Helper to extract a header value from Gmail message headers.
 */
function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

/**
 * Fetches recent emails from the user's Gmail inbox.
 * @param filter - 'unread' for unread only, 'all' for all recent emails
 */
export async function fetchRecentEmails(
  userId: string,
  limit: number = 10,
  filter: 'unread' | 'all' = 'all'
): Promise<GmailEmail[]> {
  const token = await getGmailAccessToken(userId);

  // Build Gmail query
  const query = filter === 'unread' ? 'is:unread' : 'in:inbox';

  // 1. Fetch message list
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error(`[Gmail API] List messages failed: ${errText}`);

    if (listRes.status === 401) {
      throw new Error('Gmail authentication expired. Please reconnect your Gmail account.');
    }
    throw new Error(`Gmail API error: ${listRes.status} — ${errText}`);
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

      const fromHeader = getHeader(headers, 'from') || 'Unknown Sender';
      const subjectHeader = getHeader(headers, 'subject') || 'No Subject';
      const body = extractEmailBody(detail.payload);

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
}

/**
 * Lists recent email threads from the user's inbox.
 */
export async function listGmailThreads(
  userId: string,
  limit: number = 10,
  query: string = ''
): Promise<GmailThread[]> {
  const token = await getGmailAccessToken(userId);

  const q = query || 'in:inbox';
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(q)}&maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) {
    if (listRes.status === 401) throw new Error('Gmail authentication expired. Please reconnect.');
    throw new Error(`Gmail API error listing threads: ${listRes.status}`);
  }

  const listData = await listRes.json();
  const threads = listData.threads || [];
  if (threads.length === 0) return [];

  // Fetch detail for each thread (minimal format to save quota)
  const threadPromises = threads.map(async (t: any) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!detailRes.ok) return null;

      const detail = await detailRes.json();
      const msgs = (detail.messages || []).map((msg: any) => {
        const headers = msg.payload?.headers || [];
        return {
          id: msg.id,
          from: getHeader(headers, 'from') || 'Unknown',
          to: getHeader(headers, 'to') || '',
          subject: getHeader(headers, 'subject') || 'No Subject',
          snippet: msg.snippet || '',
          date: getHeader(headers, 'date') || '',
          body: '',
        };
      });

      return {
        id: detail.id,
        snippet: detail.messages?.[0]?.snippet || '',
        historyId: detail.historyId || '',
        messagesCount: detail.messages?.length || 0,
        messages: msgs,
      };
    } catch (err) {
      console.error(`[Gmail API] Failed to fetch thread ${t.id}:`, err);
      return null;
    }
  });

  const results = await Promise.all(threadPromises);
  return results.filter((t): t is GmailThread => t !== null);
}

/**
 * Retrieves a specific email thread by ID with full message bodies.
 */
export async function getGmailThread(userId: string, threadId: string): Promise<GmailThread | null> {
  const token = await getGmailAccessToken(userId);

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error('Gmail authentication expired. Please reconnect.');
    throw new Error(`Gmail API error fetching thread: ${res.status}`);
  }

  const detail = await res.json();
  const msgs = (detail.messages || []).map((msg: any) => {
    const headers = msg.payload?.headers || [];
    return {
      id: msg.id,
      from: getHeader(headers, 'from') || 'Unknown',
      to: getHeader(headers, 'to') || '',
      subject: getHeader(headers, 'subject') || 'No Subject',
      snippet: msg.snippet || '',
      date: getHeader(headers, 'date') || '',
      body: extractEmailBody(msg.payload),
    };
  });

  return {
    id: detail.id,
    snippet: detail.messages?.[0]?.snippet || '',
    historyId: detail.historyId || '',
    messagesCount: detail.messages?.length || 0,
    messages: msgs,
  };
}

/**
 * Searches Gmail with an arbitrary query string.
 */
export async function searchGmailEmailsWithQuery(
  userId: string,
  query: string,
  limit: number = 10
): Promise<GmailEmail[]> {
  const token = await getGmailAccessToken(userId);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) {
    if (listRes.status === 401) throw new Error('Gmail authentication expired. Please reconnect.');
    throw new Error(`Gmail search failed: ${listRes.status}`);
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];
  if (messages.length === 0) return [];

  const emailPromises = messages.map(async (msg: any) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!detailRes.ok) return null;

      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];

      return {
        id: detail.id,
        threadId: detail.threadId,
        from: getHeader(headers, 'from') || 'Unknown Sender',
        subject: getHeader(headers, 'subject') || 'No Subject',
        snippet: detail.snippet || '',
        body: extractEmailBody(detail.payload) || detail.snippet || '',
        timestamp: Math.floor(parseInt(detail.internalDate) / 1000),
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.all(emailPromises);
  return results.filter((e): e is GmailEmail => e !== null);
}

/**
 * Sends an email directly from the authenticated Gmail inbox.
 */
export async function sendGmailEmail(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = await getGmailAccessToken(userId);

  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ];

  const rawMessage = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Gmail API] Send email failed: ${errText}`);
    return { success: false, error: `Failed to send email: ${res.status}` };
  }

  const data = await res.json();
  return { success: true, messageId: data.id };
}

/**
 * Creates a draft email in the user's Gmail account.
 */
export async function createGmailDraft(
  userId: string,
  threadId: string | undefined | null,
  replyBody: string,
  recipient?: string,
  subject?: string
): Promise<boolean> {
  const token = await getGmailAccessToken(userId);

  let to = recipient || '';
  let emailSubject = subject || 'No Subject';
  let messageId = '';
  let parentThreadId = threadId || undefined;

  if (threadId) {
    // Fetch thread details to locate Message-ID and Subject for linking
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
        messageId = getHeader(headers, 'message-id');
        const originalSubject = getHeader(headers, 'subject') || 'Re: Thread';
        emailSubject = originalSubject.toLowerCase().startsWith('re:') ? originalSubject : 'Re: ' + originalSubject;
        
        // Get the sender of the original message to reply to
        const fromVal = getHeader(headers, 'from');
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

  // POST to Gmail drafts endpoint
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
}

/**
 * Lists all labels in the user's Gmail account.
 */
export async function listGmailLabels(userId: string): Promise<GmailLabel[]> {
  const token = await getGmailAccessToken(userId);

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error('Gmail authentication expired. Please reconnect.');
    throw new Error(`Gmail API error listing labels: ${res.status}`);
  }

  const data = await res.json();
  const labels = data.labels || [];

  return labels.map((label: any) => ({
    id: label.id,
    name: label.name,
    type: label.type || 'user',
    messagesTotal: label.messagesTotal,
    messagesUnread: label.messagesUnread,
  }));
}

/**
 * Applies or removes a label from a Gmail thread.
 */
export async function applyGmailLabel(
  userId: string,
  threadId: string,
  labelId: string,
  action: 'add' | 'remove' = 'add'
): Promise<{ success: boolean; error?: string }> {
  const token = await getGmailAccessToken(userId);

  const body: any = {};
  if (action === 'add') {
    body.addLabelIds = [labelId];
  } else {
    body.removeLabelIds = [labelId];
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Gmail API] Label modification failed: ${errText}`);
    return { success: false, error: `Failed to ${action} label: ${res.status}` };
  }

  return { success: true };
}
