'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Link as LinkIcon,
  Bell,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconColor: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from document classList or localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const mainNavItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, bgColor: 'bg-blue-500/10 border-blue-500/20', iconColor: 'text-blue-500 dark:text-blue-400' },
    { name: 'AI Agent', href: '/dashboard/ai-agent', icon: Bot, bgColor: 'bg-purple-500/10 border-purple-500/20', iconColor: 'text-purple-500 dark:text-purple-400' },
    { name: 'Briefing', href: '/dashboard/briefing', icon: FileText, bgColor: 'bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-500 dark:text-amber-400' },
    { name: 'Integrations', href: '/dashboard/integrations', icon: LinkIcon, bgColor: 'bg-cyan-500/10 border-cyan-500/20', iconColor: 'text-cyan-500 dark:text-cyan-400' },
    { name: 'Alerts', href: '/dashboard/alerts', icon: Bell, bgColor: 'bg-rose-500/10 border-rose-500/20', iconColor: 'text-rose-500 dark:text-rose-400' },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, bgColor: 'bg-emerald-500/10 border-emerald-500/20', iconColor: 'text-emerald-500 dark:text-emerald-400' },
  ];

  const bottomNavItem: SidebarItem = {
    name: 'Pricing Settings',
    href: '/dashboard/pricing',
    icon: CreditCard,
    bgColor: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-500 dark:text-violet-400'
  };

  const renderNavItem = (item: SidebarItem) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center space-x-4 px-3 py-3 rounded-xl transition-all duration-200 border border-transparent ${
          isActive 
            ? 'bg-indigo-50/50 dark:bg-white/5 border-indigo-100 dark:border-white/10 text-indigo-600 dark:text-white shadow-inner shadow-indigo-100/5 dark:shadow-white/5 font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50/30 dark:hover:bg-white/5'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.bgColor} flex-shrink-0 transition-transform duration-200 hover:scale-105`}>
          <Icon className="w-5 h-5" />
        </div>
        {!isCollapsed && <span className="text-sm font-semibold tracking-wide">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] overflow-hidden relative">
      {/* Sidebar background blurs */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 filter blur-[80px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-purple-500/5 filter blur-[80px] pointer-events-none -z-10" />

      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-950/40 backdrop-blur-xl h-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-4 border-b border-slate-200 dark:border-white/5 justify-between">
          <Link href="/" className="flex items-center space-x-3 group overflow-hidden">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />
            </div>
            {!isCollapsed && (
              <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent transition-opacity duration-300">
                OmniSync<span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">.AI</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Options */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {mainNavItems.map(renderNavItem)}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-2">
          {renderNavItem(bottomNavItem)}
          
          {/* Sign Out & Collapse Controls */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-4 w-full px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-all duration-200 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-rose-500/10 bg-rose-500/5 text-rose-400 flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Sign Out</span>}
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center w-full py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 mt-2 cursor-pointer"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header bar */}
        <header className="h-20 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-8 bg-white/40 dark:bg-slate-950/10 backdrop-blur-md">
          <h1 className="text-xl font-bold font-display text-slate-800 dark:text-white tracking-wide">
            {mainNavItems.find(item => item.href === pathname)?.name || bottomNavItem.name}
          </h1>
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer shadow-sm dark:shadow-none"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>

            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-semibold">User Account</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300 block">{user.email}</span>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full bg-purple-500/5 filter blur-[100px] pointer-events-none -z-10" />
          {children}
        </main>
      </div>
    </div>
  );
}
