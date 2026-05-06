import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Linkedin, Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { login, signUp } from "../lib/api";

interface AuthProps {
  onAuthComplete: () => void | Promise<void>;
  initialMode?: 'login' | 'signup';
}

export const Auth = ({ onAuthComplete, initialMode = 'signup' }: AuthProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        await signUp({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          workspaceName: `${formData.name.split(" ")[0] || "New"} Workspace`,
        });
      } else {
        await login({
          email: formData.email,
          password: formData.password,
        });
      }
      await onAuthComplete();
      setLoading(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Authentication failed";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex w-12 h-12 bg-brand-accent text-white items-center justify-center rounded-xl shadow-xl shadow-brand-accent/20 mb-4 animate-pulse">
            <Linkedin className="w-6 h-6" />
          </div>
          <h1 className="text-5xl font-light tracking-tighter text-white">
            {mode === 'signup' ? 'Create Identity' : 'Resume Access'}
          </h1>
          <p className="text-slate-500 font-serif italic italic">Establish your connection to the growth matrix.</p>
        </div>

        <div className="glass-panel p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe"
                    className="w-full bg-slate-900 border border-brand-border p-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-900 border border-brand-border pl-12 pr-4 py-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-brand-border pl-12 pr-4 py-4 rounded-xl text-white outline-none focus:border-brand-accent transition-all text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-brand-accent text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-[.3em] shadow-xl shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all disabled:opacity-50 group mt-8"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signup' ? "Initialize Account" : "Access Console")}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />}
            </button>
            {error && <p className="text-xs text-red-400 pt-2">{error}</p>}
          </form>

          <div className="pt-6 border-t border-brand-border text-center">
            <button 
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-accent transition-colors"
            >
              {mode === 'signup' ? "Already have an identity? Access here" : "Need a new identity? Initialize here"}
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 justify-center text-[10px] font-bold uppercase text-slate-600 tracking-[0.2em]">
          <ShieldCheck className="w-3 h-3 text-brand-accent" />
          Secure Protocol 2.4.1 Verified
        </div>
      </motion.div>
    </div>
  );
};
