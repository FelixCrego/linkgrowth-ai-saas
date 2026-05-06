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
import { billingStatus, createCheckout, linkedinAuthUrl, linkedinStatus, logout, me, openBillingPortal, saveOnboarding } from "./lib/api";

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [loadingSession, setLoadingSession] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [upgradeLoadingTier, setUpgradeLoadingTier] = useState<SubscriptionTier | null>(null);
  const [upgradeError, setUpgradeError] = useState("");
  const [currentTenant, setCurrentTenant] = useState<Tenant>({
    id: "workspace",
    name: "LinkGrowth Workspace",
    domain: "workspace.linkgrow.ai",
    tier: SubscriptionTier.STARTER,
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    niche: "",
    industry: "",
    targetAudience: "",
    tone: "Professional",
    frequency: "Daily"
  });

  const hydrateSession = async () => {
    const session = await me();
    setIsAuthenticated(true);
    setIsOnboarded(session.isOnboarded);
    if (session.onboarding) {
      setPreferences(session.onboarding);
    }
    const tier =
      session.tier === "elite"
        ? SubscriptionTier.ELITE
        : session.tier === "pro"
        ? SubscriptionTier.PRO
        : SubscriptionTier.STARTER;
    setCurrentTenant({
      id: session.workspace.id,
      name: session.workspace.name,
      domain: `${session.workspace.slug}.linkgrow.ai`,
      tier,
    });
    setView(session.isOnboarded ? AppView.DASHBOARD : AppView.ONBOARDING);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        await hydrateSession();
      } catch {
        setIsAuthenticated(false);
        setIsOnboarded(false);
        setView(AppView.HOME);
      } finally {
        setLoadingSession(false);
      }
    };

    boot();
  }, []);

  // Sync state with visibility
  useEffect(() => {
    if (isAuthenticated && !isOnboarded && view !== AppView.ONBOARDING) {
      setView(AppView.ONBOARDING);
    }
    if (isOnboarded && (view === AppView.ONBOARDING || view === AppView.AUTH)) {
      setView(AppView.DASHBOARD);
    }
  }, [isAuthenticated, isOnboarded, view]);

  const handleOnboardingComplete = async (prefs: UserPreferences) => {
    await saveOnboarding(prefs);
    setPreferences(prefs);
    setIsOnboarded(true);
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setUpgradeError("");
    setUpgradeLoadingTier(tier);
    if (tier === SubscriptionTier.STARTER) {
      setUpgradeLoadingTier(null);
      if (!isAuthenticated) {
        setAuthMode("signup");
        setView(AppView.AUTH);
        return;
      }
      if (currentTenant.tier !== SubscriptionTier.STARTER) {
        await handleBillingOpen();
        return;
      }
      setView(AppView.DASHBOARD);
      return;
    }

    if (!isAuthenticated) {
      setUpgradeLoadingTier(null);
      setAuthMode("signup");
      setView(AppView.AUTH);
      return;
    }

    if (currentTenant.tier !== SubscriptionTier.STARTER && currentTenant.tier !== tier) {
      setUpgradeLoadingTier(null);
      await handleBillingOpen();
      return;
    }

    try {
      const requestedTier = tier === SubscriptionTier.PRO ? "pro" : "elite";
      const checkout = await createCheckout(requestedTier);
      window.location.href = checkout.url;
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : "Unable to start checkout.");
      setUpgradeLoadingTier(null);
    }
  };

  const switchTenant = () => {
    setCurrentTenant((prev) => ({ ...prev }));
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setIsOnboarded(false);
    setView(AppView.HOME);
  };

  const handleBillingOpen = async () => {
    try {
      const portal = await openBillingPortal();
      window.location.href = portal.url;
    } catch {
      setView(AppView.PRICING);
    }
  };

  const handleConnectLinkedin = async () => {
    const auth = await linkedinAuthUrl();
    const popup = window.open(auth.url, "_blank", "width=600,height=700");
    if (!popup) {
      window.location.href = auth.url;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        window.clearInterval(closedPoll);
        window.clearTimeout(timeout);
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const finishReject = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== "object") return;
        const payload = event.data as { type?: string; message?: string };
        if (payload.type === "LINKEDIN_CONNECTED") {
          finishResolve();
          return;
        }
        if (payload.type === "LINKEDIN_CONNECT_FAILED") {
          finishReject(payload.message ?? "LinkedIn connection failed");
        }
      };

      const closedPoll = window.setInterval(async () => {
        if (!popup.closed) return;
        try {
          const status = await linkedinStatus();
          if (status.connected) {
            finishResolve();
            return;
          }
        } catch {
          // no-op
        }
        finishReject("LinkedIn connection was cancelled");
      }, 500);

      const timeout = window.setTimeout(() => {
        try {
          popup.close();
        } catch {
          // no-op
        }
        finishReject("LinkedIn connection timed out");
      }, 120000);

      window.addEventListener("message", onMessage);
    });
  };

  const handleAuthComplete = async () => {
    await hydrateSession();
  };

  useEffect(() => {
    const syncTier = async () => {
      if (!isAuthenticated) return;
      try {
        const status = await billingStatus();
        const tier =
          status.tier === "elite"
            ? SubscriptionTier.ELITE
            : status.tier === "pro"
            ? SubscriptionTier.PRO
            : SubscriptionTier.STARTER;
        setCurrentTenant((prev) => ({ ...prev, tier }));
      } catch {
        // no-op
      }
    };
    syncTier();
  }, [isAuthenticated]);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  const renderView = () => {
    // Paywall logic
    if (view === AppView.RESEARCH && currentTenant.tier === SubscriptionTier.STARTER) {
      return <Pricing currentTier={currentTenant.tier} onUpgrade={handleUpgrade} loadingTier={upgradeLoadingTier} errorMessage={upgradeError} />;
    }

    if (view === AppView.VOICE_LAB && currentTenant.tier === SubscriptionTier.STARTER) {
      return <Pricing currentTier={currentTenant.tier} onUpgrade={handleUpgrade} loadingTier={upgradeLoadingTier} errorMessage={upgradeError} />;
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
        return <Pricing currentTier={currentTenant.tier} onUpgrade={handleUpgrade} loadingTier={upgradeLoadingTier} errorMessage={upgradeError} />;
      default:
        return <Dashboard />;
    }
  };

  // 1. Landing Case
  if (view === AppView.HOME) {
    return (
      <LandingPage 
        onGetStarted={() => {
          setAuthMode("signup");
          setView(AppView.AUTH);
        }}
        onLoginClick={() => {
          setAuthMode("login");
          setView(AppView.AUTH);
        }}
        onPriceClick={() => setView(AppView.PRICING)} 
      />
    );
  }

  // 2. Auth Case
  if (view === AppView.AUTH && !isAuthenticated) {
    return <Auth onAuthComplete={handleAuthComplete} initialMode={authMode} />;
  }

  if (view === AppView.PRICING && !isAuthenticated) {
    return <Pricing currentTier={SubscriptionTier.STARTER} onUpgrade={handleUpgrade} loadingTier={upgradeLoadingTier} errorMessage={upgradeError} />;
  }

  // 3. Onboarding Case
  if (isAuthenticated && !isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} onConnectLinkedin={handleConnectLinkedin} />;
  }

  // 4. App Console Case
  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 selection:bg-brand-accent selection:text-white">
      <div className="flex">
        <Sidebar
          currentView={view}
          setView={setView}
          tenant={currentTenant}
          onSwitchTenant={switchTenant}
          onLogout={handleLogout}
          onOpenBilling={handleBillingOpen}
        />
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
                onClick={handleBillingOpen}
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
