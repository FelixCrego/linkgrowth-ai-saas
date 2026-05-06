import { motion } from "motion/react";
import { Check, Zap, Crown, Shield } from "lucide-react";
import { SubscriptionTier } from "../types";

interface PricingProps {
  onUpgrade: (tier: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
  loadingTier?: SubscriptionTier | null;
  errorMessage?: string;
}

export const Pricing = ({ onUpgrade, currentTier, loadingTier = null, errorMessage = "" }: PricingProps) => {
  const TIERS = [
    {
      id: SubscriptionTier.STARTER,
      name: "Starter",
      price: "$0",
      desc: "For solo entrepreneurs testing the waters.",
      icon: Shield,
      features: ["3 Posts / 7 Days", "1 LinkedIn Account", "Standard Support"],
      accent: "from-slate-800 to-slate-900"
    },
    {
      id: SubscriptionTier.PRO,
      name: "Pro",
      price: "$49",
      desc: "The essential kit for established professionals.",
      icon: Zap,
      features: ["Unlimited Posts", "Deep Research Engine", "AI Brand Voice", "AI Image Generation", "Priority Support"],
      accent: "from-brand-accent/20 to-brand-accent/40",
      featured: true
    },
    {
      id: SubscriptionTier.ELITE,
      name: "Elite",
      price: "$149",
      desc: "Maximum velocity for agencies and leaders.",
      icon: Crown,
      features: ["Everything in Pro", "Highest Priority Support", "Advanced Strategy Reviews", "White-glove Onboarding", "Custom Growth Playbooks"],
      accent: "from-amber-500/20 to-amber-600/40"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="text-center mb-16 space-y-4">
        <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em]">Subscription Protocols</p>
        <h2 className="text-5xl font-light tracking-tight text-white italic font-serif">Power Up Your Engine</h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          Select a power level that matches your growth velocity. 
          Upgrade or downgrade at any time as your network expands.
        </p>
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-panel p-8 relative overflow-hidden flex flex-col group ${
              tier.featured ? 'border-brand-accent/50 shadow-2xl shadow-brand-accent/10' : ''
            }`}
          >
            {tier.featured && (
              <div className="absolute top-0 right-0 bg-brand-accent text-white text-[10px] font-bold uppercase py-1 px-4 tracking-widest rounded-bl-xl">
                Most Viral
              </div>
            )}
            
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.accent} opacity-5`}></div>
            
            <div className="relative z-10 space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-slate-800 ${tier.featured ? 'text-brand-accent' : 'text-slate-400'}`}>
                  <tier.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl text-white font-medium">{tier.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{tier.price} / mo</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 italic font-serif leading-none h-8">{tier.desc}</p>

              <div className="space-y-4 pt-4">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onUpgrade(tier.id)}
              disabled={currentTier === tier.id || loadingTier === tier.id}
              className={`relative z-10 mt-12 w-full py-4 rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] transition-all ${
                currentTier === tier.id
                  ? 'bg-slate-800 text-slate-500 cursor-default'
                  : loadingTier === tier.id
                  ? 'bg-slate-700 text-slate-300 cursor-wait'
                  : tier.featured
                  ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20 hover:scale-[1.02]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {currentTier === tier.id ? "Current Protocol" : loadingTier === tier.id ? "Redirecting..." : "Upgrade Identity"}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
