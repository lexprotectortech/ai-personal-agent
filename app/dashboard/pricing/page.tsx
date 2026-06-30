'use client';

import React from 'react';
import { CreditCard, Check, Sparkles } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    { name: 'Starter Sandbox', price: 'Free', desc: 'Sync up to 2 active sandbox channels.', features: ['WhatsApp sandbox stream', 'Daily AI digest summaries', 'Email delivery at 6 PM', '100 requests per day'] },
    { name: 'OmniSync Pro', price: '$29 / mo', desc: 'Unlimited streams and real-time alerts.', features: ['All 4 active integration streams', 'Real-time alert notifications', 'Custom smart replies', 'Priority processing queue', 'Multi-device sync'] }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 -z-10" />
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white tracking-wide">Pricing Settings & Plans</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your subscription, billings, plan configurations, and account limit boundaries.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan, index) => (
          <div key={index} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-350 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all relative overflow-hidden">
            {index === 1 && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-lg">
                Popular
              </div>
            )}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white">{plan.name}</h3>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-1">{plan.desc}</p>
              </div>
              <div className="py-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white font-display">{plan.price}</span>
              </div>
              <ul className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-4">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center space-x-2 text-sm text-slate-650 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button className={`w-full py-3 rounded-xl mt-8 font-semibold text-sm transition-all cursor-pointer ${
              index === 1 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30' 
                : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5'
            }`}>
              {index === 1 ? 'Upgrade to Pro' : 'Current Active Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
