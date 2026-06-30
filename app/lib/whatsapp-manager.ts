import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  ConnectionState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { insforge } from './insforge';

function makeInMemoryStore() {
  const simpleStore = {
    chats: {} as Record<string, any>,
    contacts: {} as Record<string, any>,
    messages: {} as Record<string, any[]>,
  };

  return {
    chats: {
      all: () => Object.values(simpleStore.chats)
    },
    contacts: simpleStore.contacts,
    messages: simpleStore.messages,
    bind: (ev: any) => {
      ev.on('chats.upsert', (newChats: any[]) => {
        for (const chat of newChats) {
          if (chat.id) {
            simpleStore.chats[chat.id] = { ...simpleStore.chats[chat.id], ...chat };
          }
        }
      });

      ev.on('chats.update', (updates: any[]) => {
        for (const update of updates) {
          if (update.id && simpleStore.chats[update.id]) {
            simpleStore.chats[update.id] = { ...simpleStore.chats[update.id], ...update };
          }
        }
      });

      ev.on('contacts.upsert', (newContacts: any[]) => {
        for (const contact of newContacts) {
          if (contact.id) {
            simpleStore.contacts[contact.id] = { ...simpleStore.contacts[contact.id], ...contact };
          }
        }
      });

      ev.on('contacts.update', (updates: any[]) => {
        for (const update of updates) {
          if (update.id && simpleStore.contacts[update.id]) {
            simpleStore.contacts[update.id] = { ...simpleStore.contacts[update.id], ...update };
          }
        }
      });

      ev.on('messages.upsert', (upsert: { messages: any[]; type: string }) => {
        if (upsert.type === 'notify') {
          for (const msg of upsert.messages) {
            const jid = msg.key?.remoteJid;
            if (!jid) continue;
            if (!simpleStore.messages[jid]) {
              simpleStore.messages[jid] = [];
            }
            simpleStore.messages[jid].push(msg);

            // Keep message history limited to last 50 messages
            if (simpleStore.messages[jid].length > 50) {
              simpleStore.messages[jid].shift();
            }

            // Capture contact name from message if available
            const senderJid = msg.key?.participant || msg.key?.remoteJid;
            if (msg.pushName && senderJid) {
              simpleStore.contacts[senderJid] = {
                id: senderJid,
                notify: msg.pushName,
                ...simpleStore.contacts[senderJid]
              };
            }
          }
        }
      });
    },
    readFromFile: (file: string) => {
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf8');
          const data = JSON.parse(raw);
          simpleStore.chats = data.chats || {};
          simpleStore.contacts = data.contacts || {};
          simpleStore.messages = data.messages || {};
        } catch (e) {
          console.error('Failed to parse store file:', e);
        }
      }
    },
    writeToFile: (file: string) => {
      try {
        fs.writeFileSync(file, JSON.stringify(simpleStore, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to write store file:', e);
      }
    }
  };
}

export interface WhatsAppConn {
  sock: any;
  store: any;
  status: 'disconnected' | 'connecting' | 'connected';
  pairingCode?: string;
  phoneNumber?: string;
  isSimulated?: boolean;
}

const globalForWhatsApp = global as unknown as {
  whatsappConnections: Record<string, WhatsAppConn>;
};

if (!globalForWhatsApp.whatsappConnections) {
  globalForWhatsApp.whatsappConnections = {};
}

export const whatsappConnections = globalForWhatsApp.whatsappConnections;

export async function initWhatsApp(userId: string, phoneNumber?: string, isNewPairing = false): Promise<WhatsAppConn> {
  // If already connected, return it
  if (whatsappConnections[userId]) {
    if (whatsappConnections[userId].status === 'connected') {
      return whatsappConnections[userId];
    }
    // If already connecting, and we are NOT requesting a fresh new pairing, keep the connection!
    if (whatsappConnections[userId].status === 'connecting' && !isNewPairing) {
      return whatsappConnections[userId];
    }
    // Otherwise, clean up the old stale socket before creating a new one
    await disconnectWhatsApp(userId);
  }

  const sessionDir = path.join(process.cwd(), '.sessions', `whatsapp_${userId}`);
  const storeFile = path.join(process.cwd(), '.sessions', `whatsapp_${userId}_store.json`);

  // Ensure directories exist
  fs.mkdirSync(path.join(process.cwd(), '.sessions'), { recursive: true });

  // ONLY clear the stale credentials directory if this is an explicit new pairing request.
  // This prevents transient close/timeout events from wiping credentials during handshake.
  if (isNewPairing) {
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      if (fs.existsSync(storeFile)) {
        fs.unlinkSync(storeFile);
      }
    } catch (err) {
      console.error('Failed to clean stale credentials before pairing:', err);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const store = makeInMemoryStore();
  try {
    if (fs.existsSync(storeFile)) {
      store.readFromFile(storeFile);
    }
  } catch (err) {
    console.error('Failed to read store file:', err);
  }

  // Save store every 10 seconds
  const storeInterval = setInterval(() => {
    try {
      if (whatsappConnections[userId]?.status === 'connected') {
        store.writeToFile(storeFile);
      }
    } catch (err) {
      console.error('Failed to write store file:', err);
    }
  }, 10000);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    // Use standard desktop browser signature to avoid WhatsApp client restrictions
    browser: ['Windows', 'Chrome', '114.0.5735.199']
  });

  store.bind(sock.ev);

  const connObj: WhatsAppConn = {
    sock,
    store,
    status: 'connecting',
    phoneNumber
  };
  whatsappConnections[userId] = connObj;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      if (whatsappConnections[userId]) {
        whatsappConnections[userId].status = 'connecting';
      }
    } else if (connection === 'open') {
      console.log(`WhatsApp connected for user: ${userId}`);
      if (whatsappConnections[userId]) {
        whatsappConnections[userId].status = 'connected';
        whatsappConnections[userId].pairingCode = undefined;
      }

      // Update Database via InsForge SDK
      try {
        const { data: existing } = await insforge.database
          .from('user_integrations')
          .select('id')
          .eq('user_id', userId)
          .eq('platform_id', 'whatsapp')
          .maybeSingle();

        if (existing) {
          await insforge.database
            .from('user_integrations')
            .update({ is_connected: true, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await insforge.database
            .from('user_integrations')
            .insert({
              user_id: userId,
              platform_id: 'whatsapp',
              is_connected: true
            });
        }
      } catch (err) {
        console.error('Failed to sync connected state to DB:', err);
      }

    } else if (connection === 'close') {
      clearInterval(storeInterval);
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`WhatsApp connection closed for user ${userId}. Status code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        if (whatsappConnections[userId]) {
          const oldPhone = whatsappConnections[userId].phoneNumber;
          setTimeout(() => {
            initWhatsApp(userId, oldPhone, false);
          }, 3000);
        }
      } else {
        // Logged out
        if (whatsappConnections[userId]) {
          whatsappConnections[userId].status = 'disconnected';
          delete whatsappConnections[userId];
        }

        // Delete session files
        try {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
          if (fs.existsSync(storeFile)) {
            fs.unlinkSync(storeFile);
          }
        } catch (err) {
          console.error('Failed to delete session files:', err);
        }

        // Update Database
        try {
          await insforge.database
            .from('user_integrations')
            .update({ is_connected: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('platform_id', 'whatsapp');
        } catch (err) {
          console.error('Failed to sync disconnected state to DB:', err);
        }
      }
    }
  });

  // Request pairing code if phone number is provided and not registered
  if (phoneNumber && !sock.authState.creds.registered) {
    try {
      // Wait for credentials to load and sync (small delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const code = await sock.requestPairingCode(cleanPhone);
      connObj.pairingCode = code;
    } catch (err) {
      console.error('Error requesting pairing code:', err);
    }
  }

  return connObj;
}

export async function initSimulatedWhatsApp(userId: string): Promise<WhatsAppConn> {
  await disconnectWhatsApp(userId);

  const sessionsDir = path.join(process.cwd(), '.sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const simFile = path.join(sessionsDir, `whatsapp_${userId}_simulated`);
  fs.writeFileSync(simFile, 'simulated', 'utf8');

  whatsappConnections[userId] = {
    sock: null,
    store: null,
    status: 'connected',
    isSimulated: true
  };

  // Sync to database via InsForge
  try {
    const { data: existing } = await insforge.database
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('platform_id', 'whatsapp')
      .maybeSingle();

    if (existing) {
      await insforge.database
        .from('user_integrations')
        .update({ is_connected: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await insforge.database
        .from('user_integrations')
        .insert({
          user_id: userId,
          platform_id: 'whatsapp',
          is_connected: true
        });
    }
  } catch (err) {
    console.error('Failed to sync simulated connected state to DB:', err);
  }

  return whatsappConnections[userId];
}

export async function disconnectWhatsApp(userId: string) {
  const conn = whatsappConnections[userId];
  const simFile = path.join(process.cwd(), '.sessions', `whatsapp_${userId}_simulated`);
  if (fs.existsSync(simFile)) {
    try {
      fs.unlinkSync(simFile);
    } catch (e) {
      console.error('Failed to delete simulation file:', e);
    }
  }

  if (conn) {
    if (conn.isSimulated) {
      delete whatsappConnections[userId];
      // Update Database
      try {
        await insforge.database
          .from('user_integrations')
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('platform_id', 'whatsapp');
      } catch (dbErr) {
        console.error('Failed to update DB on simulated disconnect:', dbErr);
      }
      return;
    }

    const sessionDir = path.join(process.cwd(), '.sessions', `whatsapp_${userId}`);
    const storeFile = path.join(process.cwd(), '.sessions', `whatsapp_${userId}_store.json`);

    // Perform socket logout if connected
    if (conn.sock && conn.status === 'connected') {
      try {
        await conn.sock.logout();
        return; // The connection close event listener will handle database and filesystem cleanup
      } catch (err: any) {
        if (err?.output?.statusCode !== 428) {
          console.error('Error during WhatsApp logout:', err);
        }
      }
    } else if (conn.sock) {
      try {
        conn.sock.end(undefined);
      } catch (e) {
        // Ignore
      }
    }

    // Force local cleanup if not connected or logout failed/skipped
    delete whatsappConnections[userId];
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      if (fs.existsSync(storeFile)) {
        fs.unlinkSync(storeFile);
      }
    } catch (err) {
      console.error('Failed to delete session files on disconnect:', err);
    }

    // Update Database
    try {
      await insforge.database
        .from('user_integrations')
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform_id', 'whatsapp');
    } catch (dbErr) {
      console.error('Failed to update DB on forced disconnect:', dbErr);
    }
  }
}

export async function getWhatsAppStatus(userId: string) {
  const conn = whatsappConnections[userId];
  const simFile = path.join(process.cwd(), '.sessions', `whatsapp_${userId}_simulated`);

  if (fs.existsSync(simFile)) {
    if (!conn || !conn.isSimulated) {
      whatsappConnections[userId] = {
        sock: null,
        store: null,
        status: 'connected',
        isSimulated: true
      };
    }
    return { status: 'connected' as const, isSimulated: true };
  }

  if (!conn) {
    const sessionDir = path.join(process.cwd(), '.sessions', `whatsapp_${userId}`);
    if (fs.existsSync(sessionDir)) {
      // Session exists, auto-reconnect in the background
      console.log(`Auto-reconnecting WhatsApp for user ${userId} on status check`);
      initWhatsApp(userId);
      return { status: 'connecting' as const };
    }
    return { status: 'disconnected' as const };
  }
  return {
    status: conn.status,
    pairingCode: conn.pairingCode,
    isSimulated: !!conn.isSimulated
  };
}

// Helpers for message extraction
export function getMessageText(message: any): string {
  if (!message) return '';
  const msg = message.message;
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  return '';
}

export function getMessageSender(message: any, store: any): string {
  if (message.key?.fromMe) return 'You';
  const jid = message.key?.participant || message.key?.remoteJid;
  if (!jid) return 'Unknown';
  const contact = store.contacts?.[jid];
  if (contact?.name) return contact.name;
  if (message.pushName) return message.pushName;
  return jid.split('@')[0];
}
