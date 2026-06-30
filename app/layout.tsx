import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/auth-provider";

export const metadata: Metadata = {
  title: "OmniSync AI - Your Integrated Personal Assistant Agent",
  description: "Connect WhatsApp, Gmail, Telegram, and Outlook to a unified AI Agent. Automate meeting summaries, smart drafts, task notifications, and daily digests in real-time.",
  keywords: ["AI Assistant", "WhatsApp AI", "Gmail AI", "Telegram Assistant", "Outlook Automation", "Task Management", "Personal Agent"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-slate-50 dark:bg-[#030014] text-slate-900 dark:text-[#f8fafc] antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
