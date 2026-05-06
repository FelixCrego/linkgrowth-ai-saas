import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, Globe, Target, ArrowRight, Loader2, Info } from "lucide-react";
import { INITIAL_TRENDS } from "../constants";
import { Trend } from "../types";
import { research } from "../lib/api";

export const Research = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Trend[]>(INITIAL_TRENDS);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError("");
    
    try {
      const result = await research(query);
      setResults(result.trends);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em]">Deep Research Engine</p>
        <h2 className="text-5xl font-light tracking-tight text-white italic font-serif">Market Intelligence</h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          AI-powered research scanning LinkedIn trends, industry whitepapers, and competitive 
          behavior to identify high-velocity growth topics.
        </p>
      </div>

      <div className="relative group max-w-2xl mx-auto">
        <div className="absolute -inset-1 bg-brand-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
        <div className="relative flex bg-slate-900 border border-brand-border p-1.5 rounded-2xl transition-all focus-within:border-brand-accent/50 shadow-2xl">
          <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search niche (e.g. B2B SaaS, Web3 Ops)..."
            className="flex-1 pl-12 pr-4 bg-transparent outline-none py-4 text-white placeholder:text-slate-600 font-light"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            className="bg-brand-accent text-white px-8 rounded-xl flex items-center gap-2 hover:bg-brand-accent/90 transition-all font-bold uppercase text-[10px] tracking-widest disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Synthesize"}
          </button>
        </div>
      </div>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <AnimatePresence mode="popLayout">
          {results.map((trend, i) => (
            <motion.div
              key={trend.topic}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel p-8 relative overflow-hidden group hover:border-brand-accent/30 transition-all flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe className="w-20 h-20 text-brand-accent" />
              </div>
              <div className="space-y-6 relative z-10 flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <Target className="w-3 h-3 text-brand-accent" />
                    Verified Trend
                  </div>
                  <div className="text-brand-accent animate-pulse">
                    <Sparkles className="w-4 h-4 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-light tracking-tight text-white group-hover:text-brand-accent transition-colors">{trend.topic}</h4>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mt-2 tracking-tighter">Niche Authority: {trend.relevance}%</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex gap-2 mb-2">
                    <Info className="w-3 h-3 text-brand-accent mt-0.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Relevance Analytics</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {trend.explanation}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-border flex justify-between items-center bg-slate-800/10 -mx-8 px-8 mt-auto">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Reach</p>
                    <p className="font-bold text-sm text-white">{trend.reach}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Sentiment</p>
                    <p className="font-bold text-sm text-green-400">{trend.sentiment}</p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-3 pt-6 group/btn text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-all mt-auto">
                  Generate Content
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
