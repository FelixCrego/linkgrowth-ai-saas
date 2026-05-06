import { useState } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  ArrowUpRight, 
  MoreHorizontal,
  Zap,
  Target,
  Sparkles,
  UserPlus,
  MessageSquare
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { INITIAL_POSTS, INITIAL_LEADS } from "../constants";

const DASHBOARD_DATA = [
  { name: 'Mon', reach: 4000, engagement: 240 },
  { name: 'Tue', reach: 3000, engagement: 198 },
  { name: 'Wed', reach: 2000, engagement: 980 },
  { name: 'Thu', reach: 2780, engagement: 390 },
  { name: 'Fri', reach: 1890, engagement: 480 },
  { name: 'Sat', reach: 2390, engagement: 380 },
  { name: 'Sun', reach: 3490, engagement: 430 },
];

export const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em] mb-2">Performance Matrix</p>
          <h2 className="text-4xl font-light tracking-tight text-white italic font-serif">Command Center</h2>
        </div>
        <div className="flex gap-4">
          <div className="flex -space-x-3">
             {[1,2,3,4].map(i => (
               <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-dark bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                 {String.fromCharCode(64 + i)}
               </div>
             ))}
             <div className="w-10 h-10 rounded-full border-2 border-brand-dark bg-brand-accent flex items-center justify-center text-[10px] font-bold text-white">
               +9
             </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Profile Views", value: "24.8K", delta: "+12.5%", icon: TrendingUp },
          { label: "Network Growth", value: "+458", delta: "+8.2%", icon: UserPlus },
          { label: "Lead Pipeline", value: "128", delta: "+15.0%", icon: ArrowUpRight },
          { label: "Post Virality", value: "88/100", delta: "Optimal", icon: Sparkles },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 space-y-4 group hover:border-brand-accent/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-800 rounded-xl text-brand-accent group-hover:scale-110 transition-transform">
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                {stat.delta}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-2xl font-light text-white mt-1">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 space-y-8">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-medium text-white italic font-serif">Reach Velocity (7 Days)</h3>
             <select className="bg-slate-800 border border-brand-border text-xs text-slate-400 px-3 py-1.5 rounded-lg outline-none focus:border-brand-accent">
               <option>Last 7 Days</option>
               <option>Last 30 Days</option>
             </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DASHBOARD_DATA}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#2563eb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="reach" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorReach)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 space-y-6 overflow-hidden">
          <h3 className="text-lg font-medium text-white italic font-serif">Strategic Leads</h3>
          <div className="space-y-4">
            {INITIAL_LEADS.slice(0, 4).map(lead => (
              <div key={lead.id} className="p-4 bg-slate-900/50 border border-brand-border rounded-xl group hover:border-brand-accent/30 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="text-sm font-medium text-white group-hover:text-brand-accent transition-colors">{lead.name}</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{lead.role} @ {lead.company}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ${
                    lead.status === 'hot' ? 'bg-red-500/10 text-red-400' :
                    lead.status === 'warm' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-4 border border-brand-border rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:border-brand-accent/50 transition-all">
            View Pipeline
          </button>
        </div>
      </div>
    </div>
  );
};
