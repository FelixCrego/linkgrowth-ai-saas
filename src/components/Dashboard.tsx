import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ArrowUpRight, Sparkles, UserPlus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dashboardMetrics, type DashboardMetricsResponse } from "../lib/api";

function compactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await dashboardMetrics();
        setMetrics(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = useMemo(() => metrics?.weeklyActivity ?? [], [metrics]);

  const statCards = useMemo(() => {
    if (!metrics) return [];
    const analytics = metrics.linkedin.analytics;
    const followerValue =
      analytics.followerCount === null ? (metrics.linkedin.connected ? "N/A" : "Not Connected") : compactNumber(analytics.followerCount);
    const followerDelta =
      analytics.followerDeltaLast7Days === null
        ? analytics.available
          ? "LinkedIn"
          : "Scope Needed"
        : `+${analytics.followerDeltaLast7Days} / 7d`;

    return [
      {
        label: "Profile Followers",
        value: followerValue,
        delta: followerDelta,
        icon: TrendingUp,
      },
      {
        label: "LinkedIn Posts",
        value: compactNumber(metrics.stats.postsTotal),
        delta: `+${metrics.stats.postsLast7Days} / 7d`,
        icon: UserPlus,
      },
      {
        label: "Drafts Generated",
        value: compactNumber(metrics.stats.draftsTotal),
        delta: `+${metrics.stats.draftsLast7Days} / 7d`,
        icon: ArrowUpRight,
      },
      {
        label: "Research Runs",
        value: compactNumber(metrics.stats.researchTotal),
        delta: `+${metrics.stats.researchLast7Days} / 7d`,
        icon: Sparkles,
      },
    ];
  }, [metrics]);

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.4em] mb-2">Performance Matrix</p>
          <h2 className="text-4xl font-light tracking-tight text-white italic font-serif">Command Center</h2>
        </div>
        <div className="flex gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-brand-dark bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400"
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-brand-dark bg-brand-accent flex items-center justify-center text-[10px] font-bold text-white">
              +9
            </div>
          </div>
        </div>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && metrics?.linkedin.analytics.error && (
        <p className="text-xs text-amber-300">
          LinkedIn analytics note: {metrics.linkedin.analytics.error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {(loading ? [0, 1, 2, 3] : statCards).map((stat, i) => (
          <motion.div
            key={loading ? `loading-${i}` : stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-panel p-6 space-y-4 group hover:border-brand-accent/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-800 rounded-xl text-brand-accent group-hover:scale-110 transition-transform">
                {loading ? <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div> : <stat.icon size={20} />}
              </div>
              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                {loading ? "..." : stat.delta}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{loading ? "Loading..." : stat.label}</p>
              <h4 className="text-2xl font-light text-white mt-1">{loading ? "—" : stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white italic font-serif">Workspace Activity (7 Days)</h3>
            <div className="bg-slate-800 border border-brand-border text-xs text-slate-400 px-3 py-1.5 rounded-lg">Live</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#2563eb" }}
                />
                <Area type="monotone" dataKey="activity" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 space-y-6 overflow-hidden">
          <h3 className="text-lg font-medium text-white italic font-serif">Recent Activity</h3>
          <div className="space-y-4">
            {loading && (
              <div className="p-4 bg-slate-900/50 border border-brand-border rounded-xl">
                <p className="text-xs text-slate-500">Loading activity...</p>
              </div>
            )}
            {!loading && metrics && metrics.recentActivity.length === 0 && (
              <div className="p-4 bg-slate-900/50 border border-brand-border rounded-xl">
                <p className="text-xs text-slate-500">No activity yet. Generate content or run research to populate data.</p>
              </div>
            )}
            {!loading &&
              metrics?.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-900/50 border border-brand-border rounded-xl group hover:border-brand-accent/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-sm font-medium text-white group-hover:text-brand-accent transition-colors">{item.label}</h5>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{timeAgo(item.createdAt)}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter bg-slate-500/10 text-slate-300">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>
                </div>
              ))}
          </div>
          {metrics?.linkedin.memberUrn && (
            <div className="pt-2 border-t border-brand-border">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Connected Account</p>
              <p className="text-xs text-slate-300 break-all">{metrics.linkedin.memberUrn}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
