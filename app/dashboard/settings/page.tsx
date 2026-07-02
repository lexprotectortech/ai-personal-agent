'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../components/auth-provider';
import { insforge } from '../../lib/insforge';
import {
  User,
  Bot,
  FileText,
  Bell,
  Shield,
  Sun,
  Moon,
  ChevronDown,
  RotateCcw,
  Save,
  ExternalLink,
  Download,
  CreditCard,
  LogOut,
  Lock,
  Info,
  Sparkles,
  Phone,
  Loader2,
  Check,
  Link as LinkIcon
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserSettings {
  displayName: string;
  timezone: string;
  assistantContext: string;
  summaryDetail: string;
  replyTone: string;
  autoPrepareDrafts: boolean;
  proactiveActions: boolean;
  briefingCadence: string;
  deliveryChannels: string[];
  syncFrequency: string;
  priorityThreshold: string;
  notificationMethods: string[];
  dataRetention: string;
  saveAssistantMemory: boolean;
  productAnalytics: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  timezone: '',
  assistantContext: 'Personal productivity, communication triage, and executive follow-ups',
  summaryDetail: 'standard',
  replyTone: 'friendly',
  autoPrepareDrafts: true,
  proactiveActions: true,
  briefingCadence: 'morning',
  deliveryChannels: ['in-app', 'email'],
  syncFrequency: 'realtime',
  priorityThreshold: 'medium-high',
  notificationMethods: ['in-app'],
  dataRetention: '90',
  saveAssistantMemory: true,
  productAnalytics: false,
};

// ─── Reusable Sub-Components ─────────────────────────────────────────────────

function SectionCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-7 shadow-sm dark:shadow-none">
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${iconBg} flex-shrink-0`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-wide">{title}</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 ${cols === 2 ? 'md:grid-cols-2' : ''} gap-5`}>
      {children}
    </div>
  );
}

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
  return (
    <div className="mb-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      {helper && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{helper}</p>}
    </div>
  );
}

function SelectField({
  label,
  helper,
  value,
  onChange,
  options,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <FieldLabel label={label} helper={helper} />
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none h-11 px-4 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-white/5 last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        {helper && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{helper}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer flex-shrink-0 ${checked
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
            : 'bg-slate-200 dark:bg-white/10'
          }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}

function PillToggleGroup({
  label,
  helper,
  options,
  selected,
  onChange,
}: {
  label: string;
  helper?: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <FieldLabel label={label} helper={helper} />
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${active
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                  : 'bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30'
                }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarCard({
  icon,
  iconBg,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Connected platforms
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
    gmail: false,
    whatsapp: false,
    slack: false,
    telegram: false,
    discord: false,
  });

  // Sent.dm State
  const [sentDmActive, setSentDmActive] = useState(false);
  const [sentDmPhone, setSentDmPhone] = useState('');
  const [sentDmChannels, setSentDmChannels] = useState<string[]>(['sms']);
  const [sentDmTime, setSentDmTime] = useState('09:00');
  const [sentDmVerified, setSentDmVerified] = useState(false);

  // Verification Sub-state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<boolean>(false);

  const SETTINGS_KEY = `omnisync_settings_${user?.id || 'anon'}`;

  // ─── Load settings from localStorage on mount ───
  useEffect(() => {
    if (!user) return;

    // Load saved settings
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    } else {
      // Initialize with user data
      setSettings((prev) => ({
        ...prev,
        displayName: user.profile?.name || user.email?.split('@')[0] || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }));
    }

    // Load theme
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, [user]);

  // ─── Load connected platforms ───
  useEffect(() => {
    if (!user) return;

    const loadPlatforms = async () => {
      try {
        const { data } = await insforge.database
          .from('user_integrations')
          .select('platform_id, is_connected');

        const statuses: Record<string, boolean> = {
          gmail: false,
          whatsapp: false,
          slack: false,
          telegram: false,
          discord: false,
        };

        if (data) {
          data.forEach((row: any) => {
            if (row.platform_id in statuses) {
              statuses[row.platform_id] = !!row.is_connected;
            }
          });
        }

        // Also check WhatsApp simulated status
        try {
          const res = await fetch('/api/whatsapp/status', {
            headers: { 'x-user-id': user.id },
          });
          const wsData = await res.json();
          if (wsData.status === 'connected') {
            statuses.whatsapp = true;
          }
        } catch (e) {
          // Silently fail
        }

        setConnectedPlatforms(statuses);

        // Load Sent.dm integration
        const { data: sentDmRow } = await insforge.database
          .from('user_integrations')
          .select('*')
          .eq('platform_id', 'sent_dm')
          .maybeSingle();

        if (sentDmRow) {
          setSentDmActive(!!sentDmRow.is_connected);
          if (sentDmRow.settings) {
            setSentDmPhone(sentDmRow.settings.phone || '');
            setSentDmChannels(sentDmRow.settings.channels || ['sms']);
            setSentDmTime(sentDmRow.settings.time || '09:00');
            setSentDmVerified(true);
          }
        } else {
          // Fallback: Check if user already has verified phone in users table
          const { data: userProfile } = await insforge.database
            .from('users')
            .select('phone')
            .eq('id', user.id)
            .maybeSingle();

          if (userProfile?.phone) {
            setSentDmPhone(userProfile.phone);
            setSentDmVerified(true);
          }
        }
      } catch (err) {
        console.error('Failed to load platform statuses:', err);
      }
    };

    loadPlatforms();
  }, [user]);

  // ─── Settings updater ───
  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Helper to send Verification Code OTP
  const sendVerificationCode = async (method: 'sms' | 'whatsapp') => {
    if (!sentDmPhone) {
      setOtpError('Please enter a phone number.');
      return;
    }
    setSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(false);

    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: sentDmPhone, method }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setOtpSuccess(true);
      setTimeout(() => setOtpSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setOtpError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Helper to verify OTP
  const verifyCode = async () => {
    if (!otpCode) {
      setOtpError('Please enter the verification code.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: sentDmPhone, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Mark as verified and active
      setSentDmVerified(true);
      setOtpSent(false);
      setOtpCode('');

      // Save phone number directly to users table
      await insforge.database
        .from('users')
        .update({ phone: sentDmPhone })
        .eq('id', user?.id);

      // Save integration directly
      await insforge.database
        .from('user_integrations')
        .upsert({
          user_id: user?.id,
          platform_id: 'sent_dm',
          is_connected: true,
          settings: {
            phone: sentDmPhone,
            channels: sentDmChannels,
            time: sentDmTime,
          },
        });

      // Sync briefing schedule
      await syncBriefingSchedule(true, sentDmTime);

      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setOtpError(err.message || 'Verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const calculateNextRunLocal = (scheduledTime: string, timeZone: string = 'UTC'): Date => {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const now = new Date();

    try {
      const tzString = now.toLocaleString('en-US', { timeZone });
      const localDateInTZ = new Date(tzString);
      const tzOffset = now.getTime() - localDateInTZ.getTime();

      const year = localDateInTZ.getFullYear();
      const month = String(localDateInTZ.getMonth() + 1).padStart(2, '0');
      const day = String(localDateInTZ.getDate()).padStart(2, '0');

      const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      const localScheduledDate = new Date(isoString);

      let scheduledDate = new Date(localScheduledDate.getTime() + tzOffset);
      if (scheduledDate.getTime() <= now.getTime()) {
        scheduledDate = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);
      }
      return scheduledDate;
    } catch (e) {
      const scheduledDate = new Date();
      scheduledDate.setUTCHours(hours, minutes, 0, 0);
      if (scheduledDate.getTime() <= now.getTime()) {
        scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
      }
      return scheduledDate;
    }
  };

  const syncBriefingSchedule = async (active: boolean, time: string) => {
    if (!user) return;

    try {
      const { data: existing } = await insforge.database
        .from('briefing_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'Daily Brief')
        .maybeSingle();

      if (active) {
        const nextRun = calculateNextRunLocal(time, settings.timezone || 'UTC');

        const scheduleData = {
          user_id: user.id,
          name: 'Daily Brief',
          description: 'Automated Daily Briefing sent via Sent.dm',
          selected_apps: ['gmail', 'whatsapp', 'telegram'],
          selected_categories: ['email', 'messages', 'tasks'],
          scheduled_time: time,
          frequency: 'daily',
          priority_level: 'Medium',
          timezone: settings.timezone || 'UTC',
          next_run_at: nextRun.toISOString()
        };

        if (existing) {
          await insforge.database
            .from('briefing_schedules')
            .update(scheduleData)
            .eq('id', existing.id);
        } else {
          await insforge.database
            .from('briefing_schedules')
            .insert(scheduleData);
        }
      } else {
        if (existing) {
          await insforge.database
            .from('briefing_schedules')
            .delete()
            .eq('id', existing.id);
        }
      }
    } catch (err) {
      console.error('Error syncing briefing schedule:', err);
    }
  };

  // ─── Save settings ───
  const saveSettings = async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    if (user) {
      try {
        const { error: integrationError } = await insforge.database
          .from('user_integrations')
          .upsert({
            user_id: user.id,
            platform_id: 'sent_dm',
            is_connected: sentDmActive,
            settings: {
              phone: sentDmPhone,
              channels: sentDmChannels,
              time: sentDmTime,
            },
          });

        if (integrationError) {
          console.error('Error saving sent_dm integration:', integrationError);
        }

        // Update phone in users table if verified
        if (sentDmVerified && sentDmPhone) {
          await insforge.database
            .from('users')
            .update({ phone: sentDmPhone })
            .eq('id', user.id);
        }

        // Sync schedule
        await syncBriefingSchedule(sentDmActive, sentDmTime);
      } catch (err) {
        console.error('Error saving sent_dm configuration:', err);
      }
    }

    setHasChanges(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  // ─── Reset settings ───
  const resetSettings = () => {
    const fresh: UserSettings = {
      ...DEFAULT_SETTINGS,
      displayName: user?.profile?.name || user?.email?.split('@')[0] || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
    setSettings(fresh);
    setHasChanges(true);
  };

  // ─── Theme toggle ───
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  // ─── Export settings ───
  const exportSettings = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnisync-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Connected count ───
  const connectedCount = Object.values(connectedPlatforms).filter(Boolean).length;

  // ─── Platform data for sidebar ───
  const platformList = [
    { id: 'gmail', name: 'Gmail', logo: '/gmail.svg' },
    { id: 'whatsapp', name: 'WhatsApp', logo: '/whatsapp.svg' },
    { id: 'slack', name: 'Slack', logo: '/slack.svg' },
    { id: 'telegram', name: 'Telegram', logo: '/telegram.svg' },
    { id: 'discord', name: 'Discord', logo: '/discord.svg' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-0">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Settings
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            Tune how OmniSync summarizes, alerts, syncs data, and protects your workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetSettings}
            className="h-9 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={saveSettings}
            className={`h-9 px-5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm ${saveFlash
                ? 'bg-emerald-500 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/20'
              }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saveFlash ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ─── Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* ─── LEFT COLUMN: Main Form ─── */}
        <div className="space-y-6">
          {/* ① Account Profile */}
          <SectionCard
            icon={<User className="w-5 h-5" />}
            iconBg="bg-indigo-500/10 border-indigo-500/20"
            iconColor="text-indigo-600 dark:text-indigo-400"
            title="Account Profile"
            subtitle="Personal context used in briefings, reply drafts, and dashboard greeting."
          >
            <FieldRow>
              <div>
                <FieldLabel label="Display name" helper="Shown across the dashboard." />
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => updateSetting('displayName', e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                  placeholder="Your name"
                />
              </div>
              <div>
                <FieldLabel label="Timezone" helper="Used for alerts and scheduled briefings." />
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(e) => updateSetting('timezone', e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                  placeholder="e.g. America/New_York"
                />
              </div>
            </FieldRow>

            <div>
              <FieldLabel label="Assistant context" helper="A short operating brief for AI prioritization." />
              <textarea
                value={settings.assistantContext}
                onChange={(e) => updateSetting('assistantContext', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none placeholder:text-slate-400"
                placeholder="Describe your role and priorities..."
              />
            </div>
          </SectionCard>

          {/* ② AI Agent Behavior */}
          <SectionCard
            icon={<Sparkles className="w-5 h-5" />}
            iconBg="bg-purple-500/10 border-purple-500/20"
            iconColor="text-purple-600 dark:text-purple-400"
            title="AI Agent Behavior"
            subtitle="Control the level of detail, tone, and autonomy for assistant-generated output."
          >
            <FieldRow>
              <SelectField
                label="Summary detail"
                helper="Default depth for AI summaries."
                value={settings.summaryDetail}
                onChange={(v) => updateSetting('summaryDetail', v)}
                options={[
                  { value: 'brief', label: 'Brief bullet points' },
                  { value: 'standard', label: 'Standard executive summary' },
                  { value: 'detailed', label: 'Detailed deep-dive' },
                ]}
              />
              <SelectField
                label="Reply tone"
                helper="Applied to generated drafts."
                value={settings.replyTone}
                onChange={(v) => updateSetting('replyTone', v)}
                options={[
                  { value: 'direct', label: 'Direct and concise' },
                  { value: 'friendly', label: 'Friendly and polished' },
                  { value: 'formal', label: 'Formal and professional' },
                ]}
              />
            </FieldRow>

            <ToggleSwitch
              label="Auto-prepare reply drafts"
              helper="Create draft replies when alerts require a response."
              checked={settings.autoPrepareDrafts}
              onChange={(v) => updateSetting('autoPrepareDrafts', v)}
            />
            <ToggleSwitch
              label="Proactive next actions"
              helper="Suggest follow-ups, tasks, and summaries after important messages."
              checked={settings.proactiveActions}
              onChange={(v) => updateSetting('proactiveActions', v)}
            />
          </SectionCard>

          {/* ③ Briefings */}
          <SectionCard
            icon={<FileText className="w-5 h-5" />}
            iconBg="bg-amber-500/10 border-amber-500/20"
            iconColor="text-amber-600 dark:text-amber-400"
            title="Briefings"
            subtitle="Choose when daily intelligence summaries are generated and where they appear."
          >
            <SelectField
              label="Briefing cadence"
              helper="Default schedule for dashboard and email digests."
              value={settings.briefingCadence}
              onChange={(v) => updateSetting('briefingCadence', v)}
              options={[
                { value: 'morning', label: 'Morning digest' },
                { value: 'evening', label: 'Evening recap' },
                { value: 'twice', label: 'Twice daily' },
                { value: 'manual', label: 'Manual only' },
              ]}
            />

            <PillToggleGroup
              label="Delivery channels"
              helper="Where briefings should be shown."
              options={['In-app', 'Email', 'WhatsApp']}
              selected={settings.deliveryChannels}
              onChange={(v) => updateSetting('deliveryChannels', v)}
            />
          </SectionCard>

          {/* ④ Alerts & Notifications */}
          <SectionCard
            icon={<Bell className="w-5 h-5" />}
            iconBg="bg-rose-500/10 border-rose-500/20"
            iconColor="text-rose-600 dark:text-rose-400"
            title="Alerts & Notifications"
            subtitle="Set defaults for Trigger.dev monitoring, urgency filtering, and notification routing."
          >
            <FieldRow>
              <SelectField
                label="Sync frequency"
                helper="How often connected apps are scanned."
                value={settings.syncFrequency}
                onChange={(v) => updateSetting('syncFrequency', v)}
                options={[
                  { value: 'realtime', label: 'Realtime where available' },
                  { value: '5min', label: 'Every 5 minutes' },
                  { value: '15min', label: 'Every 15 minutes' },
                  { value: '1hour', label: 'Every hour' },
                ]}
              />
              <SelectField
                label="Priority threshold"
                helper="Default filter for generated alerts."
                value={settings.priorityThreshold}
                onChange={(v) => updateSetting('priorityThreshold', v)}
                options={[
                  { value: 'all', label: 'All alerts' },
                  { value: 'medium-high', label: 'Medium and high only' },
                  { value: 'high', label: 'High only' },
                ]}
              />
            </FieldRow>

            <PillToggleGroup
              label="Notification methods"
              helper="Used as default when creating alert rules."
              options={['In-app', 'Email', 'Push', 'WhatsApp']}
              selected={settings.notificationMethods}
              onChange={(v) => updateSetting('notificationMethods', v)}
            />
          </SectionCard>

          {/* ⑤ Sent.dm Notifications */}
          <SectionCard
            icon={<Phone className="w-5 h-5" />}
            iconBg="bg-teal-500/10 border-teal-500/20"
            iconColor="text-teal-600 dark:text-teal-400"
            title="Sent.dm Mobile Notifications"
            subtitle="Send daily briefing summaries or critical alerts directly to your mobile device via SMS or WhatsApp."
          >
            <ToggleSwitch
              label="Enable Sent.dm Notifications"
              helper="Activate automated text message alerts."
              checked={sentDmActive}
              onChange={(v) => {
                setSentDmActive(v);
                setHasChanges(true);
              }}
            />

            {sentDmActive && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                <div>
                  <FieldLabel label="Phone Number" helper="International format starting with + (e.g. +14155552671)." />
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={sentDmPhone}
                      onChange={(e) => {
                        setSentDmPhone(e.target.value);
                        setSentDmVerified(false); // Unverify if changed
                        setHasChanges(true);
                      }}
                      className="flex-1 h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                      placeholder="+14155552671"
                      disabled={sentDmVerified && !otpSent}
                    />
                    {sentDmVerified && !otpSent ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSentDmVerified(false);
                          setHasChanges(true);
                        }}
                        className="h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={sendingOtp || !sentDmPhone}
                          onClick={() => sendVerificationCode('sms')}
                          className="h-11 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
                        >
                          {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'SMS Code'}
                        </button>
                        <button
                          type="button"
                          disabled={sendingOtp || !sentDmPhone}
                          onClick={() => sendVerificationCode('whatsapp')}
                          className="h-11 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
                        >
                          {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'WA Code'}
                        </button>
                      </div>
                    )}
                  </div>
                  {sentDmVerified && (
                    <p className="text-[11px] text-emerald-500 font-semibold mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Phone number verified and active.
                    </p>
                  )}
                </div>

                {otpSent && (
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-3">
                    <FieldLabel label="Enter Verification Code" helper="A 6-digit code has been sent to your device." />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 h-10 px-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 transition-all placeholder:text-slate-400"
                        placeholder="123456"
                      />
                      <button
                        type="button"
                        disabled={verifyingOtp || otpCode.length !== 6}
                        onClick={verifyCode}
                        className="h-10 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center min-w-[80px]"
                      >
                        {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                    {otpError && <p className="text-[11px] text-rose-500 font-semibold">{otpError}</p>}
                    {otpSuccess && <p className="text-[11px] text-emerald-500 font-semibold">Verification code sent successfully.</p>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PillToggleGroup
                    label="Active Channels"
                    helper="Channels to deliver notifications."
                    options={['sms', 'whatsapp']}
                    selected={sentDmChannels}
                    onChange={(v) => {
                      setSentDmChannels(v);
                      setHasChanges(true);
                    }}
                  />
                  <div>
                    <FieldLabel label="Daily Briefing Time" helper="Scheduled time to receive your summary." />
                    <input
                      type="time"
                      value={sentDmTime}
                      onChange={(e) => {
                        setSentDmTime(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ⑥ Privacy & Data */}
          <SectionCard
            icon={<Shield className="w-5 h-5" />}
            iconBg="bg-slate-500/10 border-slate-500/20"
            iconColor="text-slate-600 dark:text-slate-400"
            title="Privacy & Data"
            subtitle="Manage memory, retention, and optional analytics for assistant improvement."
          >
            <SelectField
              label="Data retention"
              helper="How long synced summaries and generated context are kept locally."
              value={settings.dataRetention}
              onChange={(v) => updateSetting('dataRetention', v)}
              options={[
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
                { value: '180', label: '180 days' },
                { value: '365', label: '1 year' },
              ]}
            />

            <ToggleSwitch
              label="Save assistant memory"
              helper="Remember preferences that improve future summaries and drafts."
              checked={settings.saveAssistantMemory}
              onChange={(v) => updateSetting('saveAssistantMemory', v)}
            />
            <ToggleSwitch
              label="Product analytics"
              helper="Allow anonymous usage signals for reliability and feature planning."
              checked={settings.productAnalytics}
              onChange={(v) => updateSetting('productAnalytics', v)}
            />
          </SectionCard>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="space-y-5">
          {/* Appearance Card */}
          <SidebarCard
            icon={<Sun className="w-4 h-4 text-amber-500" />}
            iconBg="bg-amber-500/10 border border-amber-500/20"
            title="Appearance"
            subtitle="Theme preference is applied immediately across the app."
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Theme</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${theme === 'dark'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                    : 'bg-amber-400'
                  }`}
              >
                <span
                  className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-3 h-3 text-indigo-600" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </SidebarCard>

          {/* Connected Apps Card */}
          <SidebarCard
            icon={<LinkIcon className="w-4 h-4 text-emerald-500" />}
            iconBg="bg-emerald-500/10 border border-emerald-500/20"
            title="Connected Apps"
            subtitle={`${connectedCount} of ${platformList.length} integrations active.`}
          >
            <div className="space-y-2.5">
              {platformList.map((platform) => {
                const isConnected = connectedPlatforms[platform.id];
                return (
                  <div key={platform.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1 shadow-sm dark:shadow-none">
                        <Image
                          src={platform.logo}
                          alt={platform.name}
                          width={18}
                          height={18}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{platform.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isConnected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5'
                        }`}
                    >
                      {isConnected ? 'Connected' : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard/integrations')}
              className="mt-4 w-full h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Manage Integrations
            </button>
          </SidebarCard>

          {/* Security Card */}
          <SidebarCard
            icon={<Lock className="w-4 h-4 text-purple-500" />}
            iconBg="bg-purple-500/10 border border-purple-500/20"
            title="Security"
            subtitle="Account and export actions for the active session."
          >
            {/* Auth info */}
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">InsForge authentication</p>
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={exportSettings}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Export Settings
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/pricing')}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Billing Settings
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </SidebarCard>

          {/* Local Preference Storage Info */}
          <div className="bg-teal-50/80 dark:bg-teal-500/5 border border-teal-200 dark:border-teal-500/15 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-teal-800 dark:text-teal-300">Local preference storage</h4>
                <p className="text-[11px] text-teal-700/80 dark:text-teal-400/70 mt-1 leading-relaxed">
                  These controls are saved in this browser and can be wired to a backend preferences table when account-level syncing is added.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
