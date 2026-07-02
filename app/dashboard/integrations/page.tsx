'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth-provider';
import { insforge } from '../../lib/insforge';
import {
  Link as LinkIcon,
  Settings,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  HelpCircle,
  Phone,
  Copy,
  Check,
  Play,
  Info,
  CheckCircle2,
  Mail,
  Terminal
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  desc: string;
  logo: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  tools: { name: string; desc: string }[];
}

const PLATFORMS: Platform[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'Connect to your Gmail inbox to monitor threads, auto-generate meeting summaries, and compose smart drafts.',
    logo: '/gmail.svg',
    bgColor: 'bg-rose-500/5 dark:bg-rose-500/5',
    borderColor: 'border-rose-500/10 dark:border-rose-500/20',
    iconBg: 'bg-rose-500/10',
    iconBorder: 'border-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    tools: [
      { name: 'gmail_list_threads', desc: 'List recent email threads in the user\'s inbox.' },
      { name: 'gmail_get_thread', desc: 'Retrieve detailed messages and headers for a specific email thread.' },
      { name: 'gmail_search_emails', desc: 'Find messages matching query tags (e.g., from, subject, dates).' },
      { name: 'gmail_create_draft', desc: 'Auto-create a draft reply to an email thread with AI suggestions.' },
      { name: 'gmail_send_email', desc: 'Deliver an email directly from the authenticated inbox.' },
      { name: 'gmail_apply_label', desc: 'Add or remove custom labels from email threads.' },
      { name: 'gmail_list_labels', desc: 'List all custom and system labels in the account.' }
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Connect your WhatsApp account using a pairing code to manage chats, fetch messages, and generate summaries.',
    logo: '/whatsapp.svg',
    bgColor: 'bg-emerald-500/5 dark:bg-emerald-500/5',
    borderColor: 'border-emerald-500/10 dark:border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tools: [
      { name: 'wa_fetch_recent_messages', desc: 'Fetch recent messages across all active chats.' },
      { name: 'wa_read_chat_history', desc: 'Read detailed chat history for a specific contact or group JID.' },
      { name: 'wa_send_message', desc: 'Send a text message to a specific contact JID.' },
      { name: 'wa_search_chats', desc: 'Search chats by contact name or JID.' },
      { name: 'wa_summarize_conversations', desc: 'Summarize the recent conversation history with a contact or group using AI.' },
      { name: 'wa_get_contact_details', desc: 'Retrieve profile details and metadata for a specific contact JID.' },
      { name: 'wa_list_groups', desc: 'List all joined WhatsApp group chats.' },
      { name: 'wa_fetch_group_messages', desc: 'Fetch recent messages specifically from a group chat room.' },
      { name: 'wa_send_group_messages', desc: 'Send a message to a WhatsApp group chat room.' }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Integrate workspace channels to track announcements and post daily summaries.',
    logo: '/slack.svg',
    bgColor: 'bg-pink-500/5 dark:bg-pink-500/5',
    borderColor: 'border-pink-500/10 dark:border-pink-500/20',
    iconBg: 'bg-pink-500/10',
    iconBorder: 'border-pink-500/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
    tools: [
      { name: 'slack_list_channels', desc: 'List active channels in the authorized Slack workspace.' },
      { name: 'slack_post_message', desc: 'Post automated AI digests or tasks directly to a text channel.' }
    ]
  },
  {
    id: 'outlook',
    name: 'Outlook',
    desc: 'Synchronize Microsoft calendars, resolve scheduling conflicts, and accept invites.',
    logo: '/outlook.svg',
    bgColor: 'bg-blue-500/5 dark:bg-blue-500/5',
    borderColor: 'border-blue-500/10 dark:border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconBorder: 'border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tools: [
      { name: 'outlook_list_events', desc: 'Retrieve scheduled calendar events for roadmap auditing.' },
      { name: 'outlook_resolve_conflicts', desc: 'Identify and resolve overlapping calendar sessions.' }
    ]
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: 'Monitor server announcement streams and dispatch instant AI alert digests.',
    logo: '/discord.svg',
    bgColor: 'bg-indigo-500/5 dark:bg-indigo-500/5',
    borderColor: 'border-indigo-500/10 dark:border-indigo-500/20',
    iconBg: 'bg-indigo-500/10',
    iconBorder: 'border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    tools: [
      { name: 'discord_list_guilds', desc: 'List linked Discord servers.' },
      { name: 'discord_post_message', desc: 'Publish task digests to a text channel.' }
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    desc: 'Monitor connection requests, feed events, and publish AI-summarized network updates.',
    logo: '/linkedin.svg',
    bgColor: 'bg-sky-500/5 dark:bg-sky-500/5',
    borderColor: 'border-sky-500/10 dark:border-sky-500/20',
    iconBg: 'bg-sky-500/10',
    iconBorder: 'border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    tools: [
      { name: 'linkedin_get_connections', desc: 'List profile connection metadata.' },
      { name: 'linkedin_post_update', desc: 'Share digests as updates on the feed.' }
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Track community group chats and send daily digest briefs through a secure bot.',
    logo: '/telegram.svg',
    bgColor: 'bg-cyan-500/5 dark:bg-cyan-500/5',
    borderColor: 'border-cyan-500/10 dark:border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    iconBorder: 'border-cyan-500/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    tools: [
      { name: 'telegram_list_updates', desc: 'Fetch incoming messages sent to the bot.' },
      { name: 'telegram_send_alert', desc: 'Send instant briefs or summaries directly to a Telegram conversation.' }
    ]
  },
  {
    id: 'others',
    name: 'Other Streams',
    desc: 'Ingest custom payloads, webhooks, and API triggers to unify external workflows.',
    logo: '/default-platform.svg',
    bgColor: 'bg-slate-500/5 dark:bg-slate-500/5',
    borderColor: 'border-slate-500/10 dark:border-slate-500/20',
    iconBg: 'bg-slate-500/10',
    iconBorder: 'border-slate-500/20',
    iconColor: 'text-slate-600 dark:text-slate-400',
    tools: [
      { name: 'webhook_ingest_payload', desc: 'Ingest and parse inbound raw JSON webhook streams.' },
      { name: 'webhook_trigger_dispatch', desc: 'Dispatch outgoing data payloads to registered webhooks.' }
    ]
  }
];

const ACTION_PARAMS_CONFIG: Record<string, { label: string; key: string; placeholder: string; type: string }[]> = {
  wa_fetch_recent_messages: [],
  wa_read_chat_history: [
    { label: 'Recipient JID or Phone Number', key: 'jid', placeholder: 'e.g. 919876543210 or 12345-67890@s.whatsapp.net', type: 'text' },
    { label: 'Limit (number of messages)', key: 'limit', placeholder: 'e.g. 20', type: 'number' }
  ],
  wa_send_message: [
    { label: 'Recipient JID or Phone Number', key: 'jid', placeholder: 'e.g. 919876543210', type: 'text' },
    { label: 'Message Text', key: 'message', placeholder: 'Type your message...', type: 'textarea' }
  ],
  wa_search_chats: [
    { label: 'Search Query', key: 'query', placeholder: 'e.g. John or Budget', type: 'text' }
  ],
  wa_summarize_conversations: [
    { label: 'Chat JID or Phone Number', key: 'jid', placeholder: 'e.g. 919876543210 or group-id@g.us', type: 'text' }
  ],
  wa_get_contact_details: [
    { label: 'Contact JID or Phone Number', key: 'jid', placeholder: 'e.g. 919876543210', type: 'text' }
  ],
  wa_list_groups: [],
  wa_fetch_group_messages: [
    { label: 'Group JID', key: 'jid', placeholder: 'e.g. 12036302492109@g.us', type: 'text' },
    { label: 'Limit', key: 'limit', placeholder: 'e.g. 20', type: 'number' }
  ],
  wa_send_group_messages: [
    { label: 'Group JID', key: 'jid', placeholder: 'e.g. 12036302492109@g.us', type: 'text' },
    { label: 'Message Text', key: 'message', placeholder: 'Type group message...', type: 'textarea' }
  ]
};

function IntegrationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [settingsPlatform, setSettingsPlatform] = useState<Platform | null>(null);

  // WhatsApp connection flow states
  const [isConnectWhatsAppOpen, setIsConnectWhatsAppOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappPairingCode, setWhatsappPairingCode] = useState('');
  const [whatsappConnectingStatus, setWhatsappConnectingStatus] = useState<'idle' | 'generating' | 'waiting' | 'success' | 'error'>('idle');
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [isWhatsappSimulated, setIsWhatsappSimulated] = useState(false);

  // WhatsApp playground states
  const [selectedAction, setSelectedAction] = useState('wa_fetch_recent_messages');
  const [actionParams, setActionParams] = useState<Record<string, string>>({});
  const [actionExecuting, setActionExecuting] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Gmail settings states
  const [gmailEmails, setGmailEmails] = useState<any[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);

  useEffect(() => {
    if (settingsPlatform?.id === 'gmail' && connectedPlatforms.gmail) {
      const loadGmailEmails = async () => {
        setGmailLoading(true);
        setGmailError(null);
        try {
          const res = await fetch('/api/gmail/emails', {
            headers: {
              'x-user-id': user?.id || '',
            },
          });
          if (!res.ok) throw new Error('Failed to fetch emails');
          const data = await res.json();
          if (data.success) {
            setGmailEmails(data.emails || []);
          } else {
            throw new Error(data.error || 'Failed to load inbox');
          }
        } catch (err: any) {
          console.error(err);
          setGmailError(err.message || 'Failed to fetch unread emails.');
        } finally {
          setGmailLoading(false);
        }
      };
      loadGmailEmails();
    } else {
      setGmailEmails([]);
    }
  }, [settingsPlatform, connectedPlatforms.gmail, user?.id]);

  // Fetch initial connection states from InsForge DB on mount
  useEffect(() => {
    const fetchConnectedStates = async () => {
      if (!user) return;
      try {
        const { data, error: dbError } = await insforge.database
          .from('user_integrations')
          .select('platform_id, is_connected');

        if (dbError) {
          setError(dbError.message);
        } else if (data) {
          const statuses: Record<string, boolean> = {};
          data.forEach((row: any) => {
            statuses[row.platform_id] = row.is_connected;
          });
          setConnectedPlatforms(statuses);
        }
      } catch (err) {
        console.error('Failed to load integration states:', err);
        setError('Error loading integrations from database.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchConnectedStates();
  }, [user]);

  // Sync WhatsApp status from server on mount
  useEffect(() => {
    if (!user) return;
    const checkInitialWhatsAppStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status', {
          headers: { 'x-user-id': user.id }
        });
        const data = await res.json();
        if (data.status === 'connected') {
          setConnectedPlatforms(prev => ({ ...prev, whatsapp: true }));
          setIsWhatsappSimulated(!!data.isSimulated);
        } else {
          setConnectedPlatforms(prev => ({ ...prev, whatsapp: false }));
          setIsWhatsappSimulated(false);
        }
      } catch (err) {
        console.error('Failed to sync WhatsApp status:', err);
      }
    };
    checkInitialWhatsAppStatus();
  }, [user]);

  // Poll WhatsApp connection status when modal is open and waiting for user to pair
  useEffect(() => {
    if (!user || !isConnectWhatsAppOpen || whatsappConnectingStatus !== 'waiting') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/status', {
          headers: { 'x-user-id': user.id }
        });
        const data = await res.json();
        if (data.status === 'connected') {
          setWhatsappConnectingStatus('success');
          setConnectedPlatforms(prev => ({ ...prev, whatsapp: true }));
          clearInterval(interval);
          
          // Auto close modal after 1.5s on success
          setTimeout(() => {
            setIsConnectWhatsAppOpen(false);
          }, 1500);
        }
      } catch (err) {
        console.error('Failed to poll WhatsApp status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, isConnectWhatsAppOpen, whatsappConnectingStatus]);

  // Handle OAuth redirect callback checking on mount
  useEffect(() => {
    const checkRedirectCallback = async () => {
      if (!user || pageLoading) return;
      
      const code = searchParams.get('code');
      const connectedParam = searchParams.get('connected');

      if (code) {
        // Clear query parameters from URL immediately to keep it clean
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        setLoadingStates(prev => ({ ...prev, gmail: true }));
        try {
          const redirectUri = `${window.location.origin}/dashboard/integrations`;
          const res = await fetch('/api/auth/google-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id,
            },
            body: JSON.stringify({ code, redirectUri }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Token exchange request failed');
          }

          setConnectedPlatforms(prev => ({
            ...prev,
            gmail: true
          }));
        } catch (err: any) {
          console.error('Gmail OAuth callback sync failed:', err);
          setError(err.message || 'Failed to synchronize Gmail connection state after authorization.');
        } finally {
          setLoadingStates(prev => ({ ...prev, gmail: false }));
        }
        return;
      }
      
      if (connectedParam) {
        // Clear query parameters from URL immediately to keep it clean
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        setLoadingStates(prev => ({ ...prev, [connectedParam]: true }));
        try {
          // Check if row already exists
          const { data: existingRow } = await insforge.database
            .from('user_integrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('platform_id', connectedParam)
            .maybeSingle();

          if (existingRow) {
            await insforge.database
              .from('user_integrations')
              .update({ is_connected: true, updated_at: new Date().toISOString() })
              .eq('id', existingRow.id);
          } else {
            await insforge.database
              .from('user_integrations')
              .insert({
                user_id: user.id,
                platform_id: connectedParam,
                is_connected: true
              });
          }

          setConnectedPlatforms(prev => ({
            ...prev,
            [connectedParam]: true
          }));
        } catch (err) {
          console.error('Callback sync failed:', err);
          setError('Failed to synchronize connection state after authorization.');
        } finally {
          setLoadingStates(prev => ({ ...prev, [connectedParam]: false }));
        }
      }
    };
    checkRedirectCallback();
  }, [user, pageLoading, searchParams]);

  // Toggle connection state in InsForge DB
  const toggleConnection = async (platformId: string) => {
    if (!user) return;
    const isCurrentlyConnected = !!connectedPlatforms[platformId];

    // Gmail requires real Google OAuth connection flow
    if (platformId === 'gmail' && !isCurrentlyConnected) {
      setError(null);
      try {
        const clientId = '341616289505-7th9ide0lfctrf9cd7okcrjm4gopkglc.apps.googleusercontent.com';
        const redirectUri = `${window.location.origin}/dashboard/integrations`;
        const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose';
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
        window.location.href = authUrl;
      } catch (err) {
        console.error('OAuth redirect failed:', err);
        setError('Failed to trigger Google authentication redirect.');
      }
      return;
    }

    // WhatsApp pairing code connection flow
    if (platformId === 'whatsapp') {
      if (!isCurrentlyConnected) {
        setWhatsappPhone('');
        setWhatsappPairingCode('');
        setWhatsappConnectingStatus('idle');
        setWhatsappError(null);
        setCopyCodeSuccess(false);
        setIsConnectWhatsAppOpen(true);
      } else {
        setLoadingStates(prev => ({ ...prev, [platformId]: true }));
        setError(null);
        try {
          const res = await fetch('/api/whatsapp/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id
            }
          });
          const data = await res.json();
          if (data.success) {
            setConnectedPlatforms(prev => ({ ...prev, whatsapp: false }));
            setIsWhatsappSimulated(false);
          } else {
            setError(data.error || 'Failed to disconnect WhatsApp.');
          }
        } catch (err) {
          console.error(err);
          setError('Failed to contact WhatsApp disconnect endpoint.');
        } finally {
          setLoadingStates(prev => ({ ...prev, [platformId]: false }));
        }
      }
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, [platformId]: true }));
    setError(null);

    try {
      // Check if the configuration row exists
      const { data: existingRow, error: checkError } = await insforge.database
        .from('user_integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform_id', platformId)
        .maybeSingle();

      if (checkError) {
        setError(checkError.message);
        return;
      }

      if (existingRow) {
        // Row exists: update or delete connection state
        const { error: updateError } = await insforge.database
          .from('user_integrations')
          .update({ 
            is_connected: !isCurrentlyConnected, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingRow.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        // Row does not exist: insert new record
        const { error: insertError } = await insforge.database
          .from('user_integrations')
          .insert({
            user_id: user.id,
            platform_id: platformId,
            is_connected: true
          });

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      // Update local state
      setConnectedPlatforms(prev => ({
        ...prev,
        [platformId]: !isCurrentlyConnected
      }));
    } catch (err) {
      console.error('Toggle connection failed:', err);
      setError('Connection state modification failed. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !whatsappPhone) return;

    setWhatsappConnectingStatus('generating');
    setWhatsappError(null);

    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ phoneNumber: whatsappPhone })
      });
      const data = await res.json();
      if (data.error) {
        setWhatsappError(data.error);
        setWhatsappConnectingStatus('error');
      } else if (data.pairingCode) {
        setWhatsappPairingCode(data.pairingCode);
        setWhatsappConnectingStatus('waiting');
      } else {
        setWhatsappError(data.message || 'Failed to generate pairing code.');
        setWhatsappConnectingStatus('error');
      }
    } catch (err) {
      console.error(err);
      setWhatsappError('Failed to generate linking code. Please check your network and try again.');
      setWhatsappConnectingStatus('error');
    }
  };

  const handleConnectSimulatedWhatsApp = async () => {
    if (!user) return;

    setWhatsappConnectingStatus('generating');
    setWhatsappError(null);

    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ simulated: true })
      });
      const data = await res.json();
      if (data.error) {
        setWhatsappError(data.error);
        setWhatsappConnectingStatus('error');
      } else {
        setIsWhatsappSimulated(true);
        setConnectedPlatforms(prev => ({ ...prev, whatsapp: true }));
        setWhatsappConnectingStatus('success');
        
        setTimeout(() => {
          setIsConnectWhatsAppOpen(false);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setWhatsappError('Failed to enable simulated mode. Please check your connection.');
      setWhatsappConnectingStatus('error');
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Loading your integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Overview Banner */}
      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 -z-10" />
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white tracking-wide">Connected Integrations</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Link communication platforms to your personal AI agent. Connection states are synchronized directly to your secure InsForge database.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLATFORMS.map((platform) => {
          const isConnected = !!connectedPlatforms[platform.id];
          const isLoading = !!loadingStates[platform.id];

          return (
            <div
              key={platform.id}
              className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/10 hover:shadow-lg transition-all duration-300 relative ${platform.bgColor} ${platform.borderColor}`}
            >
              {/* Platform Header */}
              <div className="flex flex-col items-center text-center space-y-4 mb-4">
                <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-center p-3 shadow-inner">
                  <Image
                    src={platform.logo}
                    alt={platform.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{platform.name}</h3>
                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full ${
                    isConnected 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isConnected ? (platform.id === 'whatsapp' && isWhatsappSimulated ? 'Connected (Simulated)' : 'Connected') : 'Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[200px] h-12 overflow-hidden text-ellipsis font-sans">
                  {platform.desc}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-2">
                <button
                  onClick={() => toggleConnection(platform.id)}
                  disabled={isLoading}
                  className={`w-full h-10 inline-flex items-center justify-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    isConnected
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                      : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/10'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isConnected ? (
                    'Disconnect'
                  ) : (
                    'Connect'
                  )}
                </button>

                {isConnected && (
                  <button
                    onClick={() => {
                      setSettingsPlatform(platform);
                      setSelectedAction(platform.id === 'whatsapp' ? 'wa_fetch_recent_messages' : '');
                      setActionResult(null);
                      setActionError(null);
                      setActionParams({});
                    }}
                    className="w-full h-10 inline-flex items-center justify-center text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    Configure Settings
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Connect Modal */}
      {isConnectWhatsAppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b081e] border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => setIsConnectWhatsAppOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center space-x-4 bg-slate-50 dark:bg-slate-950/40">
              <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center p-2 flex-shrink-0">
                <Image
                  src="/whatsapp.svg"
                  alt="WhatsApp"
                  width={30}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-wide">Connect WhatsApp</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Link your account using a pairing code</p>
              </div>
            </div>

            {/* Form / Code Display */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {whatsappConnectingStatus === 'idle' && (
                <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                      Phone Number (with Country Code)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="e.g. 919876543210"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal block">
                      Enter the number linked to your WhatsApp mobile app. Include the country code (e.g. 91 for India, 1 for USA) without leading +, spaces, or dashes.
                    </span>
                  </div>

                  {whatsappError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{whatsappError}</span>
                    </div>
                  )}

                   <button
                    type="submit"
                    className="w-full h-11 inline-flex items-center justify-center text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                  >
                    Generate Pairing Code
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                    <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Or Test Sandbox</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectSimulatedWhatsApp}
                    className="w-full h-11 inline-flex items-center justify-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    🚀 Connect in Simulated Mode (Test Sandbox)
                  </button>
                </form>
              )}

              {whatsappConnectingStatus === 'generating' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <div className="text-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">Generating code...</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Connecting to WhatsApp servers</span>
                  </div>
                </div>
              )}

              {whatsappConnectingStatus === 'waiting' && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Your Linking Code</span>
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold tracking-[0.25em] text-indigo-600 dark:text-indigo-400 pl-4">
                        {whatsappPairingCode ? `${whatsappPairingCode.slice(0, 4)}-${whatsappPairingCode.slice(4)}` : ''}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(whatsappPairingCode);
                          setCopyCodeSuccess(true);
                          setTimeout(() => setCopyCodeSuccess(false), 2000);
                        }}
                        className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      >
                        {copyCodeSuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-left space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">How to connect:</span>
                    <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                      <li>Open <span className="font-semibold text-slate-800 dark:text-white">WhatsApp</span> on your mobile device.</li>
                      <li>Tap <span className="font-semibold text-slate-800 dark:text-white">Settings</span> or <span className="font-semibold text-slate-800 dark:text-white">Menu</span> (⋮) &rarr; <span className="font-semibold text-slate-800 dark:text-white">Linked Devices</span>.</li>
                      <li>Choose <span className="font-semibold text-slate-800 dark:text-white">Link a Device</span>, then tap <span className="font-semibold text-slate-800 dark:text-white">Link with phone number instead</span>.</li>
                      <li>Enter the 8-character linking code shown above.</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 dark:text-slate-500 pt-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>Waiting for pairing confirmation...</span>
                  </div>
                </div>
              )}

              {whatsappConnectingStatus === 'success' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Check className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">WhatsApp Connected!</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Syncing chats and status</span>
                  </div>
                </div>
              )}

              {whatsappConnectingStatus === 'error' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{whatsappError}</span>
                  </div>
                  <button
                    onClick={() => setWhatsappConnectingStatus('idle')}
                    className="w-full h-11 inline-flex items-center justify-center text-sm font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setIsConnectWhatsAppOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog (Modal) */}
      {settingsPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b081e] border border-slate-200 dark:border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative max-h-[85vh] flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => setSettingsPlatform(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center space-x-4 bg-slate-50 dark:bg-slate-950/40">
              <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center p-2 flex-shrink-0">
                <Image
                  src={settingsPlatform.logo}
                  alt={settingsPlatform.name}
                  width={30}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-wide">{settingsPlatform.name} MCP Configuration {settingsPlatform.id === 'whatsapp' && isWhatsappSimulated && '(Simulated)'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Available model context protocol tools and actions</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Tool Definitions</h4>
              
              <div className="space-y-3">
                {settingsPlatform.tools.map((tool) => (
                  <div key={tool.name} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-500/5 dark:bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/10">
                        {tool.name}
                      </code>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{tool.desc}</p>
                  </div>
                ))}
              </div>

              {/* WhatsApp Action Playground */}
              {settingsPlatform.id === 'whatsapp' && (
                <div className="mt-8 border-t border-slate-200 dark:border-white/5 pt-6 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                    <Play className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                    Interactive Action Playground
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Test and execute any WhatsApp MCP tools live against your connected session.
                  </p>

                  {isWhatsappSimulated && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex items-center space-x-2">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>Simulated Mode is active. Tool executions will return high-quality mock data.</span>
                    </div>
                  )}

                  {/* Select Tool */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Select WhatsApp Action</label>
                    <select
                      value={selectedAction}
                      onChange={(e) => {
                        setSelectedAction(e.target.value);
                        setActionParams({});
                        setActionResult(null);
                        setActionError(null);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {settingsPlatform.tools.map((tool) => (
                        <option key={tool.name} value={tool.name}>{tool.name} - {tool.desc.slice(0, 50)}...</option>
                      ))}
                    </select>
                  </div>

                  {/* Render Dynamic Inputs */}
                  {ACTION_PARAMS_CONFIG[selectedAction] && ACTION_PARAMS_CONFIG[selectedAction].length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
                      {ACTION_PARAMS_CONFIG[selectedAction].map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{field.label}</label>
                          {field.type === 'textarea' ? (
                            <textarea
                              placeholder={field.placeholder}
                              value={actionParams[field.key] || ''}
                              onChange={(e) => setActionParams(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full min-h-[60px] p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                            />
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={actionParams[field.key] || ''}
                              onChange={(e) => setActionParams(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setActionExecuting(true);
                      setActionError(null);
                      setActionResult(null);
                      try {
                        const res = await fetch('/api/whatsapp/action', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': user.id
                          },
                          body: JSON.stringify({
                            action: selectedAction,
                            params: actionParams
                          })
                        });
                        const data = await res.json();
                        if (data.error) {
                          setActionError(data.error);
                        } else {
                          setActionResult(data);
                        }
                      } catch (err) {
                        setActionError('Network request failed');
                      } finally {
                        setActionExecuting(false);
                      }
                    }}
                    disabled={actionExecuting}
                    className="w-full h-9 inline-flex items-center justify-center text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {actionExecuting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    ) : (
                      <Play className="w-3 h-3 mr-2" />
                    )}
                    Run Action
                  </button>

                  {/* Show error */}
                  {actionError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Show results */}
                  {actionResult && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Execution Result</label>
                      
                      {selectedAction === 'wa_summarize_conversations' && actionResult.summary ? (
                        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/10 bg-indigo-500/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {actionResult.summary}
                        </div>
                      ) : (
                        <pre className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 text-[10px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto max-h-[250px] leading-relaxed">
                          {JSON.stringify(actionResult, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Gmail Action Playground / Inbox Console */}
              {settingsPlatform.id === 'gmail' && (
                <div className="mt-8 border-t border-slate-200 dark:border-white/5 pt-6 space-y-6">
                  {/* Interactive Inbox Console */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-2 text-red-500" />
                      Interactive Inbox Console
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live interactive view of your Gmail inbox (pulls recent unread emails).
                    </p>

                    {!connectedPlatforms.gmail ? (
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Please connect your Gmail account to enable this console.</span>
                      </div>
                    ) : gmailLoading ? (
                      <div className="flex items-center justify-center p-8 space-x-2">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-xs text-slate-400">Fetching live inbox...</span>
                      </div>
                    ) : gmailError ? (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{gmailError}</span>
                      </div>
                    ) : gmailEmails.length === 0 ? (
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Your inbox is clean! No unread emails found.</span>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-white/10 max-h-[250px] overflow-y-auto">
                        {gmailEmails.map((email) => (
                          <div key={email.id} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors space-y-1 bg-white dark:bg-slate-950/40 text-left">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{email.from}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                {new Date(email.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate">{email.subject}</div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{email.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MCP Connection Guide */}
                  <div className="space-y-4 border-t border-slate-200 dark:border-white/5 pt-6">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                      <Terminal className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                      MCP Connection Guide
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure your local Model Context Protocol client (Cursor, Claude Desktop, etc.) to use your Gmail integration directly.
                    </p>

                    <div className="relative group">
                      <pre className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 text-[10px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": [
        "-y",
        "gmail-mcp"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "341616289505-7th9ide0lfctrf9cd7okcrjm4gopkglc.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "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"
      }
    }
  }
}`}
                      </pre>
                      <button
                        onClick={() => {
                          const configStr = JSON.stringify({
                            mcpServers: {
                              gmail: {
                                command: "npx",
                                args: ["-y", "gmail-mcp"],
                                env: {
                                  GOOGLE_CLIENT_ID: "341616289505-7th9ide0lfctrf9cd7okcrjm4gopkglc.apps.googleusercontent.com",
                                  GOOGLE_CLIENT_SECRET: "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"
                                }
                              }
                            }
                          }, null, 2);
                          navigator.clipboard.writeText(configStr);
                          setCopiedMcpConfig(true);
                          setTimeout(() => setCopiedMcpConfig(false), 2000);
                        }}
                        className="absolute top-3 right-3 px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-300 dark:border-white/10 text-[10px] text-slate-600 dark:text-slate-300 transition-all font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedMcpConfig ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setSettingsPlatform(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Loading integrations interface...</span>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
