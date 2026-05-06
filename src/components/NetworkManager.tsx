import { motion } from "motion/react";
import { Users, UserPlus, MessageSquare, Filter, MoreHorizontal, Mail } from "lucide-react";
import { INITIAL_LEADS } from "../constants";

import { ConnectionSuggestion } from "../types";

const SUGGESTIONS: ConnectionSuggestion[] = [
  { id: '1', name: "Sarah Chen", role: "VP of Engineering", company: "Meta", reason: "Active in B2B SaaS trends you follow.", matchScore: 94 },
  { id: '2', name: "Marcus Thorne", role: "Growth Lead", company: "Stripe", reason: "Mutual connection with 12 prospects.", matchScore: 88 },
  { id: '3', name: "Elena Rodriguez", role: "Founder", company: "NextScale", reason: "Recently posted about your core niche.", matchScore: 82 },
];

export const NetworkManager = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em] mb-2">Network Engine</p>
          <h2 className="text-4xl font-light tracking-tight text-white italic font-serif">Growth Hub</h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-brand-border text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            Segment
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent/90 transition-all shadow-xl shadow-brand-accent/10 rounded-xl">
            <UserPlus className="w-3.5 h-3.5" />
            Sync Identity
          </button>
        </div>
      </header>

      {/* Connection Suggestions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">AI Connection Intelligence</h3>
          <div className="h-px bg-brand-border flex-1 mx-6 opacity-50"></div>
          <span className="text-[10px] text-brand-accent font-bold uppercase">Refreshing in 2h</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUGGESTIONS.map((s, i) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 space-y-4 group"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-brand-accent font-bold text-xl border border-slate-700/50">
                  {s.name.charAt(0)}
                </div>
                <div className="bg-brand-accent/10 px-2 py-1 rounded text-[10px] font-bold text-brand-accent">
                  {s.matchScore}% Match
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium group-hover:text-brand-accent transition-colors">{s.name}</h4>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">{s.role} @ {s.company}</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-brand-accent/30 pl-3">
                "{s.reason}"
              </p>
              <button className="w-full py-3 bg-slate-800 hover:bg-brand-accent text-slate-400 hover:text-white transition-all rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <UserPlus className="w-3.5 h-3.5" />
                Request Connection
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "New Leads", value: "48", color: "text-blue-600" },
          { label: "Pending Requests", value: "112", color: "text-orange-600" },
          { label: "Response Rate", value: "28%", color: "text-green-600" },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border border-brand-black/5">
            <p className="text-[10px] uppercase font-mono opacity-40 mb-1">{stat.label}</p>
            <p className={`text-4xl font-light tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-brand-border rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="bg-slate-800/40 px-8 py-6 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-white font-medium italic font-serif">Lead Priority Queue</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">32 active prospects synced</span>
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-slate-800/20">
              <th className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">Global Identity</th>
              <th className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">Org & Role</th>
              <th className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">AI Engagement</th>
              <th className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">Sentiment</th>
              <th className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500 text-right">Utility</th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_LEADS.map((lead, i) => (
              <motion.tr 
                key={lead.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-all group pointer-events-none md:pointer-events-auto"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 border border-slate-700/50 flex items-center justify-center font-bold text-brand-accent group-hover:scale-105 transition-transform rounded-lg">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-white group-hover:text-brand-accent transition-colors">{lead.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase font-bold">UID-{lead.id}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-200">{lead.company}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{lead.role}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-medium">Last Contact: {lead.lastContact}</span>
                    <div className="flex gap-1 mt-1.5">
                      <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-accent/30"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-accent/30"></div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      lead.status === 'hot' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                      lead.status === 'warm' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      lead.status === 'hot' ? 'text-red-400' :
                      lead.status === 'warm' ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2.5 bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-all">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-2.5 bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-all">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
