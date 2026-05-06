import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Research } from "./components/Research";
import { PostComposer } from "./components/PostComposer";
import { NetworkManager } from "./components/NetworkManager";
import { Onboarding } from "./components/Onboarding";
import { UserPreferences, AppView, SubscriptionTier, Tenant } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { Pricing } from "./components/Pricing";
import { LandingPage } from "./components/LandingPage";
import { Auth } from "./components/Auth";
import { VoiceLab } from "./components/VoiceLab";

const MOCK_TENANTS: Tenant[] = [
  { id: '1', name: "Apex Growth", domain: "apex.linkgrow.ai", tier: SubscriptionTier.ELITE },
  { id: '2', name: "Solo Venture", domain: "solo.linkgrow.ai", tier: SubscriptionTier.STARTER },
  { id: '3', name: "Marketing Hub", domain: "m-hub.linkgrow.ai", tier: SubscriptionTier.PRO },
];

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(MOCK_TENANTS[0]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    niche: "",
    industry: "",
    targetAudience: "",
    tone: "Professional",
    frequency: "Daily"
  });

  // Sync state with visibility
  useEffect(() => {
    if (isAuthenticated && !isOnboarded && view !== AppView.ONBOARDING) {
      setView(AppView.ONBOARDING);
    }
    if (isOnboarded && (view === AppView.ONBOARDING || view === AppView.AUTH)) {
      setView(AppView.DASHBOARD);
    }
  }, [isAuthenticated, isOnboarded, view]);

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    setIsOnboarded(true);
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    setCurrentTenant(prev => ({ ...prev, tier }));
    setView(AppView.DASHBOARD);
  };

  const switchTenant = () => {
    const currentIndex = MOCK_TENANTS.findIndex(t => t.id === currentTenant.id);
    const nextIndex = (currentIndex + 1) % MOCK_TENANTS.length;
    setCurrentTenant(MOCK_TENANTS[nextIndex]);
  };

  const renderView = () => {
    // Paywall logic
    if (view === AppView.RESEARCH && currentTenant.tier === SubscriptionTier.STARTER) {
      return <Pricing currentTier={currentTenant.tier} onUpgrade={handleUpgrade} />;
    }

    switch (view) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.RESEARCH:
        return <Research />;
      case AppView.COMPOSER:
        return <PostComposer />;
      case AppView.NETWORK:
        return <NetworkManager />;
      case AppView.VOICE_LAB:
        return <VoiceLab />;
      case AppView.PRICING:
        return <Pricing currentTier={currentTenant.tier} onUpgrade={handleUpgrade} />;
      default:
        return <Dashboard />;
    }
  };

  // 1. Landing Case
  if (view === AppView.HOME) {
    return (
      <LandingPage 
        onGetStarted={() => setView(AppView.AUTH)} 
        onPriceClick={() => setView(AppView.PRICING)} 
      />
    );
  }

  // 2. Auth Case
  if (view === AppView.AUTH && !isAuthenticated) {
    return <Auth onAuthComplete={() => setIsAuthenticated(true)} />;
  }

  // 3. Onboarding Case
  if (isAuthenticated && !isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 4. App Console Case
  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 selection:bg-brand-accent selection:text-white">
      <div className="flex">
        <Sidebar currentView={view} setView={setView} tenant={currentTenant} onSwitchTenant={switchTenant} />
        <div className="flex-1 flex flex-col ml-64">
          <header className="h-16 border-b border-brand-border px-8 flex items-center justify-between bg-brand-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <h1 className="text-sm font-medium text-white opacity-80 uppercase tracking-widest">Active Account: <span className="opacity-100 italic transition-all">{currentTenant.name}</span></h1>
              <div className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-tighter transition-all ${
                currentTenant.tier === SubscriptionTier.ELITE ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                currentTenant.tier === SubscriptionTier.PRO ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {currentTenant.tier}
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-tighter">Live</span>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView(AppView.PRICING)}
                className="text-[10px] font-bold text-brand-accent uppercase tracking-widest hover:underline"
              >
                Subscription Manage
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Bridge:</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-brand-border cursor-pointer hover:border-brand-accent transition-all"></div>
            </div>
          </header>

          <main className="p-12 min-h-[calc(100vh-64px)] overflow-x-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10 w-full text-center overflow-hidden">
              <p className="font-serif italic text-[20vw] text-white opacity-[0.015] leading-none select-none whitespace-nowrap">
                LinkGrow AI
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
