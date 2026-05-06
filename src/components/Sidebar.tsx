import { motion } from "motion/react";
import { 
  BarChart3, 
  Search, 
  PenTool, 
  Users, 
  Linkedin, 
  Settings,
  ChevronRight,
  LogOut,
  Mic2
} from "lucide-react";
import { AppView, Tenant, SubscriptionTier } from "../types";

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  tenant: Tenant;
  onSwitchTenant: () => void;
}

export const Sidebar = ({ currentView, setView, tenant, onSwitchTenant }: SidebarProps) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: "Analytics", icon: BarChart3 },
    { id: AppView.RESEARCH, label: "Deep Research", icon: Search },
    { id: AppView.COMPOSER, label: "Content Engine", icon: PenTool },
    { id: AppView.VOICE_LAB, label: "Voice Lab", icon: Mic2 },
    { id: AppView.NETWORK, label: "Growth Hub", icon: Users },
  ];

  return (
    <div className="w-64 h-screen border-r border-brand-border flex flex-col p-6 fixed left-0 top-0 bg-brand-sidebar z-50">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-8 h-8 bg-brand-accent flex items-center justify-center rounded-lg shadow-lg shadow-brand-accent/20">
          <Linkedin className="text-white w-5 h-5" />
        </div>
        <h1 className="font-semibold text-lg tracking-tight text-white">LinkGrowth AI</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 group rounded-xl ${
              currentView === item.id 
                ? "bg-slate-800 text-white shadow-xl shadow-black/20 border border-slate-700/50" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <item.icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
            <span className="font-medium tracking-wide">{item.label}</span>
            {currentView === item.id && (
              <motion.div layoutId="active-indicator" className="ml-auto w-1 h-4 bg-brand-accent rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-brand-border space-y-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          tenant.tier === SubscriptionTier.ELITE ? 'bg-amber-500/5 border-amber-500/20' :
          tenant.tier === SubscriptionTier.PRO ? 'bg-brand-accent/5 border-brand-accent/20' :
          'bg-slate-500/5 border-slate-500/20'
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
            tenant.tier === SubscriptionTier.ELITE ? 'text-amber-500' :
            tenant.tier === SubscriptionTier.PRO ? 'text-brand-accent' :
            'text-slate-400'
          }`}>
            Current Tier: {tenant.tier}
          </p>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            {tenant.tier === SubscriptionTier.STARTER 
              ? "Upgrade to unlock Deep Research." 
              : "Enterprise control enabled."}
          </p>
          <button 
            onClick={onSwitchTenant}
            className="w-full bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-white text-[10px] font-bold py-2 rounded-lg uppercase tracking-widest transition-all"
          >
            Switch Workspace
          </button>
        </div>
        
        <div className="space-y-1">
          <button 
            onClick={() => setView(AppView.PRICING)}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-500 hover:bg-slate-800/40 rounded-lg transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium capitalize">Billing & Plans</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-400/60 hover:bg-red-500/5 rounded-lg transition-all">
            <LogOut className="w-4 h-4" />
            <span className="font-medium capitalize">Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
