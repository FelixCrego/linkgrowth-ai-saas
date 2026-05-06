import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Linkedin, ArrowRight, ShieldCheck, Zap, BarChart, CheckCircle2, Globe, Target, UserPlus, PenTool } from "lucide-react";
import { UserPreferences } from "../types";

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>({
    niche: "",
    industry: "",
    targetAudience: "",
    tone: "Professional",
    frequency: "Daily"
  });

  const handleConnect = async () => {
    setLoading(true);
    // Simulate OAuth Popup
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  const nextStep = () => setStep(step + 1);
  const finish = () => onComplete(prefs);

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="w-16 h-16 bg-brand-accent text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-accent/20">
              <Linkedin className="w-8 h-8" />
            </div>
            <div className="space-y-4">
              <h2 className="text-7xl font-light tracking-tighter leading-none text-white">Activate Engine</h2>
              <p className="text-xl text-slate-400 font-serif italic max-w-sm">Securely link your professional identity to initialize the growth protocols.</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-brand-accent text-white py-6 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[.3em] shadow-2xl shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all group"
            >
              {loading ? "Establishing Bridge..." : "Establish Connection"}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />}
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <div className="w-16 h-16 bg-brand-accent text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-accent/20">
              <Target className="w-8 h-8" />
            </div>
            <div className="space-y-4">
              <h2 className="text-6xl font-light tracking-tighter leading-none text-white">Niche Authority</h2>
              <p className="text-sm text-slate-400 font-serif italic uppercase tracking-widest">Define your professional parameters</p>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Niche</label>
                <input 
                  type="text" 
                  placeholder="e.g. B2B SaaS Growth"
                  className="w-full bg-slate-900/50 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all"
                  value={prefs.niche}
                  onChange={(e) => setPrefs({...prefs, niche: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Industry</label>
                <input 
                  type="text" 
                  placeholder="e.g. Enterprise Technology"
                  className="w-full bg-slate-900/50 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all"
                  value={prefs.industry}
                  onChange={(e) => setPrefs({...prefs, industry: e.target.value})}
                />
              </div>
            </div>
            <button
              onClick={nextStep}
              disabled={!prefs.niche || !prefs.industry}
              className="w-full bg-brand-accent text-white py-6 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[.3em] hover:bg-brand-accent/90 transition-all disabled:opacity-30 group"
            >
              Continue Parameters <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8">
            <div className="w-16 h-16 bg-brand-accent text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-accent/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="space-y-4">
              <h2 className="text-6xl font-light tracking-tighter leading-none text-white">Target Audience</h2>
              <p className="text-sm text-slate-400 font-serif italic uppercase tracking-widest">Who are we scaling for?</p>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Decision Makers</label>
                <input 
                  type="text" 
                  placeholder="e.g. CMOs, Founders, VPs of Marketing"
                  className="w-full bg-slate-900/50 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all"
                  value={prefs.targetAudience}
                  onChange={(e) => setPrefs({...prefs, targetAudience: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brand Tone</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer"
                    value={prefs.tone}
                    onChange={(e) => setPrefs({...prefs, tone: e.target.value})}
                  >
                    <option>Professional</option>
                    <option>Bold / Disruptive</option>
                    <option>Technical / Niche</option>
                    <option>Thought-Leader</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Post Cadence</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer"
                    value={prefs.frequency}
                    onChange={(e) => setPrefs({...prefs, frequency: e.target.value})}
                  >
                    <option>Daily</option>
                    <option>3x / Week</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={nextStep}
              disabled={!prefs.targetAudience}
              className="w-full bg-brand-accent text-white py-6 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[.3em] hover:bg-brand-accent/90 transition-all disabled:opacity-30 group"
            >
              Initialize Engine <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <div className="w-16 h-16 bg-brand-accent text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-accent/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-4 text-center">
              <h2 className="text-7xl font-light tracking-tighter leading-none text-white">Ready to Scale</h2>
              <p className="text-xl text-slate-400 font-serif italic max-w-sm mx-auto">Your growth matrix is polarized and ready for deployment.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="p-4 border border-brand-border rounded-xl bg-brand-accent/5">
                <p className="text-[9px] font-bold text-brand-accent uppercase tracking-widest mb-1">LinkedIn</p>
                <p className="text-xs text-white">Active Bridge</p>
              </div>
              <div className="p-4 border border-brand-border rounded-xl bg-brand-accent/5">
                <p className="text-[9px] font-bold text-brand-accent uppercase tracking-widest mb-1">AI Logic</p>
                <p className="text-xs text-white">Deep Context Ready</p>
              </div>
            </div>
            <button
              onClick={finish}
              className="w-full bg-brand-accent text-white py-6 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[.3em] shadow-2xl shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all group"
            >
              Enter Command Center <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-dark z-[100] flex items-center justify-center p-6 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-screen border-l border-brand-border pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 to-transparent"></div>
        <div className="flex flex-col h-full p-24 justify-center space-y-12 opacity-5">
          <BarChart className="w-64 h-64 text-white" />
          <Globe className="w-48 h-48 self-end text-white" />
          <PenTool className="w-32 h-32 text-white" />
        </div>
      </div>

      <div className="max-w-xl w-full relative z-10">
        <div className="mb-16">
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`flex-1 h-1 transition-all duration-700 rounded-full ${
                  s <= step ? "bg-brand-accent shadow-[0_0_8px_rgba(37,99,235,0.6)]" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] text-brand-accent font-bold uppercase tracking-[0.3em]">Sequence 0{step} / 04</span>
            <div className="h-px bg-brand-border flex-1"></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center gap-2 justify-center text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">
          <ShieldCheck className="w-3 h-3 text-brand-accent" />
          Protocol 2.4.1 Encryption Active
        </div>
      </div>
    </div>
  );
};
