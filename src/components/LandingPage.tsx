import { motion } from "motion/react";
import { 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Linkedin,
  Search,
  PenTool,
  Image as ImageIcon
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onPriceClick: () => void;
}

export const LandingPage = ({ onGetStarted, onPriceClick }: LandingPageProps) => {
  return (
    <div className="bg-brand-dark min-h-screen text-slate-200 overflow-x-hidden">
      {/* Navigation */}
      <nav className="h-20 border-b border-brand-border px-8 flex items-center justify-between bg-brand-dark/50 backdrop-blur-md sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-accent flex items-center justify-center rounded-lg shadow-lg shadow-brand-accent/20">
            <Linkedin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">LinkGrowth AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Features</a>
          <button onClick={onPriceClick} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Pricing</button>
          <button 
            onClick={onGetStarted}
            className="bg-brand-accent text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent/90 transition-all shadow-xl shadow-brand-accent/10"
          >
            Launch Engine
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-8 pt-32 pb-48 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-20 left-12 w-96 h-96 bg-brand-accent/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-20 right-12 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest"
          >
            <Sparkles className="w-3 h-3" />
            Next-Gen LinkedIn Growth
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl md:text-8xl font-light tracking-tighter leading-[0.9] text-white"
          >
            Scale Your <span className="font-serif italic text-brand-accent">Authority</span> <br /> 
            at Warp Speed.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 font-serif italic max-w-2xl mx-auto leading-relaxed"
          >
            The multi-tenant LinkedIn growth engine powered by Deep Research AI. 
            Automate high-velocity content, track network analytics, and dominate your niche.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-brand-accent text-white px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase text-[11px] tracking-[0.25em] shadow-2xl shadow-brand-accent/20 hover:scale-105 transition-all group"
            >
              Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold uppercase text-[11px] tracking-[0.25em] hover:bg-white/10 transition-all">
              Live Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-8 py-32 max-w-7xl mx-auto space-y-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-center text-brand-accent">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-light text-white tracking-tight">AI Deep Research</h2>
            <p className="text-slate-400 leading-relaxed font-serif italic text-lg">
              Stop guessing what resonates. Our engine scrapes industry newsletters, 
              competitor posts, and trending hashtags to surface high-engagement topics 
              specific to your target audience.
            </p>
            <ul className="space-y-4 pt-4 text-sm font-medium text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Real-time Niche Analysis
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Competitor Intelligence Scans
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Sentiment Tracking
              </li>
            </ul>
          </div>
          <div className="glass-panel p-2 aspect-[4/3] relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-sm"></div>
            <div className="relative h-full border border-white/5 rounded-xl bg-slate-900 shadow-2xl overflow-hidden">
              <img
                src="/images/features/research.png"
                alt="Deep research screenshot"
                className="w-full h-full object-cover object-left-top transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-dark/80 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center md:flex-row-reverse">
          <div className="glass-panel p-2 aspect-[4/3] relative overflow-hidden order-last md:order-first group">
            <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-sm"></div>
            <div className="relative h-full border border-white/5 rounded-xl bg-slate-900 shadow-2xl overflow-hidden">
              <img
                src="/images/features/composer.png"
                alt="Content engine screenshot"
                className="w-full h-full object-cover object-left-top transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-dark/80 to-transparent pointer-events-none"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-center text-brand-accent">
              <PenTool className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-light text-white tracking-tight">Content Autopilot</h2>
            <p className="text-slate-400 leading-relaxed font-serif italic text-lg">
              Transform raw research into viral hooks and thought-leadership posts. 
              Our AI maintains your brand voice across multi-tenant accounts with 
              scheduling built-in.
            </p>
            <ul className="space-y-4 pt-4 text-sm font-medium text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Custom Brand Personas
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Viral Hook Generation
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Smart Scheduling Engine
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-start">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-center text-brand-accent">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-light text-white tracking-tight">AI Image Studio</h2>
            <p className="text-slate-400 leading-relaxed font-serif italic text-lg">
              Generate on-brand visuals directly from your campaign prompt. Pair every post with a custom image built for
              LinkedIn feed performance.
            </p>
            <ul className="space-y-4 pt-4 text-sm font-medium text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Prompt-to-Visual Generation
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                Social-Ready 1:1 Assets
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                One-Click Composer Integration
              </li>
            </ul>
          </div>

          <div className="glass-panel p-2 aspect-[4/3] relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-sm"></div>
            <div className="relative h-full border border-white/5 rounded-xl bg-slate-900 shadow-2xl overflow-hidden">
              <img
                src="/images/features/dashboard.png"
                alt="Dashboard screenshot"
                className="w-full h-full object-cover object-left-top transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-dark/80 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-slate-900/50 border-y border-brand-border py-24 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center opacity-40">
           <div className="space-y-2">
             <p className="text-3xl font-bold italic tracking-tighter">1.2M+</p>
             <p className="text-[10px] font-bold uppercase tracking-widest">Post Impressions</p>
           </div>
           <div className="space-y-2">
             <p className="text-3xl font-bold italic tracking-tighter">45K+</p>
             <p className="text-[10px] font-bold uppercase tracking-widest">Connections Made</p>
           </div>
           <div className="space-y-2">
             <p className="text-3xl font-bold italic tracking-tighter">200+</p>
             <p className="text-[10px] font-bold uppercase tracking-widest">Growth Orgs</p>
           </div>
           <div className="space-y-2">
             <p className="text-3xl font-bold italic tracking-tighter">14s</p>
             <p className="text-[10px] font-bold uppercase tracking-widest">Average Research Speed</p>
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 py-48 text-center bg-gradient-to-t from-brand-accent/5 to-transparent">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-6xl font-light tracking-tighter text-white">The Future of Growth <br /> is <span className="italic font-serif text-brand-accent">Intelligence.</span></h2>
          <button 
            onClick={onGetStarted}
            className="bg-brand-accent text-white px-12 py-6 rounded-2xl flex items-center justify-center gap-4 mx-auto font-bold uppercase text-xs tracking-[.3em] shadow-[0_0_40px_rgba(37,99,235,0.2)] hover:scale-105 transition-all group"
          >
            Initialize Your Engine <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </button>
          <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Shield className="w-3 h-3 text-brand-accent" />
            No Credit Card Required For 14-Day Pro Trial
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Linkedin className="w-5 h-5" />
            <span className="font-bold tracking-tight text-white uppercase text-xs">LinkGrowth AI © 2024</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Protocol</a>
            <a href="#" className="hover:text-white transition-colors">API Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
