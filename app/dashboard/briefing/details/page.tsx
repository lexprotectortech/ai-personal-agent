'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../components/auth-provider';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  AtSign,
  ListTodo,
  Clock,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Calendar
} from 'lucide-react';

interface BriefingItem {
  id: string;
  source: 'whatsapp' | 'gmail' | 'telegram' | 'outlook';
  category: 'email' | 'messages' | 'mentions' | 'tasks' | 'followups';
  sender: string;
  text: string;
  summary: string;
  timestamp: string;
  actionRequired: boolean;
  suggestedAction?: string | null;
}

interface BriefingData {
  topHighlightedBrief: {
    title: string;
    summary: string;
  };
  categorySummaries: Record<string, { count: number; summary: string }>;
  items: BriefingItem[];
}

function BriefingDetailsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const catParam = searchParams.get('category');

  // Page States
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingName, setBriefingName] = useState('Daily Briefing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Item States
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<BriefingItem | null>(null);

  // Composer States
  const [draftText, setDraftText] = useState('');
  const [instruction, setInstruction] = useState('');
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Sync / Load Initial Data
  const loadBriefingData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let targetId = idParam;

      // If id is not specified or "daily", fetch history first to locate the latest run
      if (!targetId || targetId === 'daily') {
        const historyRes = await fetch('/api/briefing/generated', {
          headers: { 'x-user-id': user.id }
        });
        const historyData = await historyRes.json();
        
        if (historyData.success && historyData.history?.length > 0) {
          targetId = historyData.history[0].id;
        } else {
          // Fallback to static mock brief if no history runs exist
          setBriefing(getMockBriefingData());
          setBriefingName('Daily Briefing (Simulated)');
          setLoading(false);
          return;
        }
      }

      // Fetch the specific briefing detail
      const res = await fetch(`/api/briefing/generated?id=${targetId}`, {
        headers: { 'x-user-id': user.id }
      });
      const data = await res.json();

      if (data.success && data.briefing) {
        setBriefing(data.briefing.briefing_content);
        setBriefingName(data.briefing.name);
      } else {
        setError(data.error || 'Failed to load briefing details.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBriefingData();
    }
  }, [user, idParam]);

  // Handle default tab select from url
  useEffect(() => {
    if (catParam) {
      setActiveTab(catParam);
    }
  }, [catParam]);

  // Set default active item when briefing items change
  useEffect(() => {
    if (briefing && briefing.items) {
      const filtered = getFilteredItems();
      if (filtered.length > 0) {
        setActiveItem(filtered[0]);
      } else {
        setActiveItem(null);
      }
    }
  }, [briefing, activeTab]);

  // Trigger AI Composer
  const handleComposeDraft = async (item: BriefingItem, customInst?: string) => {
    setComposing(true);
    setComposeError(null);
    setSendSuccess(false);

    try {
      const res = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          sender: item.sender,
          text: item.text,
          source: item.source,
          category: item.category,
          userInstruction: customInst || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setDraftText(data.draft);
      } else {
        setComposeError(data.error || 'Failed to generate AI draft.');
      }
    } catch (e: any) {
      setComposeError(e.message || 'Error communicating with composition agent.');
    } finally {
      setComposing(false);
    }
  };

  // Trigger AI Composer whenever active item changes (auto-load first draft)
  useEffect(() => {
    if (activeItem) {
      setDraftText('');
      setInstruction('');
      setSendSuccess(false);
      setComposeError(null);
      handleComposeDraft(activeItem);
    }
  }, [activeItem]);

  // Send Message Dispatch
  const handleSendMessage = async () => {
    if (!activeItem || !draftText.trim()) return;
    setSending(true);
    setComposeError(null);
    setSendSuccess(false);

    try {
      const recipient = activeItem.source === 'gmail' || activeItem.source === 'outlook' 
        ? `${activeItem.sender.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`
        : activeItem.sender; // for WhatsApp/Telegram use sender name/phone

      const res = await fetch('/api/message/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          recipient,
          messageText: draftText,
          source: activeItem.source
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccess(true);
        setDraftText('');
        setInstruction('');
      } else {
        setComposeError(data.error || 'Failed to send message.');
      }
    } catch (e: any) {
      setComposeError(e.message || 'Error occurred while sending.');
    } finally {
      setSending(false);
    }
  };

  // Helper arrays
  const getFilteredItems = (): BriefingItem[] => {
    if (!briefing || !briefing.items) return [];
    if (activeTab === 'all') return briefing.items;
    return briefing.items.filter(item => item.category === activeTab);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-500" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'outlook':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getCategoryIcon = (categoryKey: string) => {
    switch (categoryKey) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'messages':
        return <MessageSquare className="w-4 h-4" />;
      case 'mentions':
        return <AtSign className="w-4 h-4" />;
      case 'tasks':
        return <ListTodo className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Static Mock Fallback Data
  const getMockBriefingData = (): BriefingData => {
    return {
      topHighlightedBrief: {
        title: "Sarah Jenkins requested dashboard adjustments",
        summary: "Sarah requested card layout updates to support HSL theme colors. WhatsApp and Telegram messages indicate a marketing campaign draft is due and devnet upgrade is scheduled."
      },
      categorySummaries: {
        email: { count: 1, summary: "Urgent email from Sarah regarding HSL theme adjustments." },
        messages: { count: 2, summary: "Urgent campaign drafts and roadmap conflicts." },
        mentions: { count: 1, summary: "Dockerfile staging approvals tag." },
        tasks: { count: 2, summary: "Solana devnet node operator upgrades due." },
        followups: { count: 1, summary: "Daniel waiting for layout review feedback." }
      },
      items: [
        {
          id: "mock-wa-1",
          source: "whatsapp",
          category: "messages",
          sender: "Alice (Marketing)",
          text: "Hey, did you finish the draft proposal for the marketing campaign? #urgent",
          summary: "Draft proposal query for campaign #urgent",
          timestamp: "5m ago",
          actionRequired: true,
          suggestedAction: "Reply to Alice"
        },
        {
          id: "mock-gm-1",
          source: "gmail",
          category: "email",
          sender: "Sarah Jenkins (Product)",
          text: "Urgent: UI feedback on Personal AI Agent dashboard. We need to adjust card layouts to support HSL tailwind colors. Sync today at 4 PM.",
          summary: "Adjust layouts to support HSL colors",
          timestamp: "1h ago",
          actionRequired: true,
          suggestedAction: "Acknowledge sync today"
        },
        {
          id: "mock-ol-1",
          source: "outlook",
          category: "tasks",
          sender: "Calendar Invite",
          text: "Q3 Product Roadmap Alignment - Scheduled for tomorrow at 2:00 PM. Note: Overlaps with weekly design critique.",
          summary: "Calendar conflict Roadmap vs Design Critique",
          timestamp: "2h ago",
          actionRequired: true,
          suggestedAction: "Propose relocation"
        },
        {
          id: "mock-tg-1",
          source: "telegram",
          category: "tasks",
          sender: "Solana Developer Chat",
          text: "#announcement Node operators must patch to version 1.18.15. Mainnet upgrade tonight at 23:00 UTC.",
          summary: "Mainnet node operator upgrade required",
          timestamp: "3h ago",
          actionRequired: true,
          suggestedAction: "Perform upgrade patch"
        },
        {
          id: "mock-tg-2",
          source: "telegram",
          category: "followups",
          sender: "Daniel (Design)",
          text: "Did you get a chance to review the new design files? Let me know your thoughts.",
          summary: "Daniel waiting for design files feedback",
          timestamp: "4h ago",
          actionRequired: true,
          suggestedAction: "Provide feedback"
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Compiling Intelligence Logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Briefing Loading Error</h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={loadBriefingData}
          className="h-10 px-5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10"
        >
          Try Reloading
        </button>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-0">
      
      {/* Top Breadcrumb Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-white/5 pb-4">
        <button
          onClick={() => router.push('/dashboard/briefing')}
          className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Intelligence Log Details</span>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white capitalize">{briefingName}</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin">
        {[
          { id: 'all', name: 'All Updates', icon: Sparkles },
          { id: 'email', name: 'Emails', icon: Mail },
          { id: 'messages', name: 'Messages', icon: MessageSquare },
          { id: 'mentions', name: 'Mentions', icon: AtSign },
          { id: 'tasks', name: 'Tasks', icon: ListTodo },
          { id: 'followups', name: 'Follow-ups', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center space-x-2 border transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold' 
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Master Detail Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Items List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">Updates ({filteredItems.length})</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-950/10">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-pulse" />
              <p className="text-sm font-semibold">All clean in this category.</p>
              <p className="text-xs text-slate-400 mt-1">No pending updates found.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const isSelected = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className={`p-4 border rounded-2xl cursor-pointer text-left transition-all relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-lg' 
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-350 dark:hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border bg-white dark:bg-white/5 ${
                          isSelected ? 'border-transparent text-slate-950' : 'border-slate-200 dark:border-white/10'
                        }`}>
                          {getSourceIcon(item.source)}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-white'}`}>
                          {item.sender}
                        </span>
                      </div>
                      <span className={`text-[10px] ${isSelected ? 'text-slate-200 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'} font-semibold`}>
                        {item.timestamp}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed font-semibold line-clamp-2 ${
                      isSelected ? 'text-indigo-100 dark:text-slate-700' : 'text-slate-650 dark:text-slate-350'
                    }`}>
                      {item.summary}
                    </p>

                    {item.actionRequired && (
                      <span className={`inline-flex items-center mt-2.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-white/20 text-white dark:bg-slate-950/10 dark:text-slate-800' 
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        Action Required
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Active Item Inspector */}
        <div className="lg:col-span-7">
          {activeItem ? (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-none space-y-6">
              
              {/* Card Header info */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                    <span className="capitalize">{activeItem.source}</span>
                    <span>•</span>
                    <span className="capitalize">{activeItem.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeItem.sender}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  {getSourceIcon(activeItem.source)}
                </div>
              </div>

              {/* Message Snippet */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Original message snippet</span>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{activeItem.text}"
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">AI Executive Summary</span>
                <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                  {activeItem.summary}
                </p>
              </div>

              {/* Quick Actions (Reply Composer) */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                    AI Response Assistant
                  </span>
                  
                  {activeItem.suggestedAction && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      Suggested: {activeItem.suggestedAction}
                    </span>
                  )}
                </div>

                {sendSuccess ? (
                  <div className="p-4 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center space-x-3 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <span>Message successfully dispatched!</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Draft Text Area */}
                    <div className="relative">
                      {composing && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl z-20 space-y-2">
                          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                          <span className="text-xs text-slate-500 font-bold">Re-drafting response...</span>
                        </div>
                      )}
                      
                      <textarea
                        required
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        placeholder="Drafting AI response..."
                        className="w-full bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 h-32 resize-none text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Customize Instructions */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Customize draft instructions (e.g. 'tell them I am busy until Friday')"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleComposeDraft(activeItem, instruction)}
                        disabled={composing}
                        className="h-8 px-3 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        Re-draft
                      </button>
                    </div>

                    {composeError && (
                      <span className="text-xs text-rose-500 font-semibold block">{composeError}</span>
                    )}

                    {/* Dispatch button */}
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={sending || !draftText.trim()}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm inline-flex items-center justify-center transition-colors cursor-pointer shadow-lg shadow-indigo-500/10 disabled:opacity-50"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending reply...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply via {activeItem.source === 'gmail' || activeItem.source === 'outlook' ? 'Email' : activeItem.source}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400">
              <Sparkles className="w-10 h-10 mb-2 animate-pulse text-slate-400" />
              <p className="text-sm font-semibold">Select an update to inspect details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BriefingDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Initializing Inspector...</span>
      </div>
    }>
      <BriefingDetailsContent />
    </Suspense>
  );
}
