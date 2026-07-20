"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { TrendingUp, Users, Server, Hash, Bot, RefreshCw } from "lucide-react";

interface StatsData {
  totalBots: number;
  onlineBots: number;
  validBots: number;
  totalServers: number;
  totalMembers: number;
  totalChannels: number;
  chartData: Array<{ date: string; servers: number; members: number; channels: number; online: number }>;
  bots: Array<{
    id: string;
    name: string;
    status: string;
    tokenValid: boolean;
    serverCount: number;
    memberCount: number;
    channelCount: number;
    onlineUserCount: number;
    lastSyncedAt: string;
  }>;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-sync all bots on mount, then refresh stats
  useEffect(() => {
    (async () => {
      setSyncing(true);
      try {
        // First fetch current stats to get bot list
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          // Refresh each valid bot in parallel
          const validBots = (data.bots || []).filter((b: any) => b.tokenValid);
          if (validBots.length > 0) {
            await Promise.all(validBots.map((b: any) =>
              fetch(`/api/bots/${b.id}/refresh`, { method: "POST" }).catch(() => {})
            ));
            // Re-fetch stats after sync
            await fetchStats();
          }
        }
      } finally {
        setSyncing(false);
      }
    })();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Refresh each bot's stats
      if (stats?.bots) {
        for (const bot of stats.bots) {
          if (bot.tokenValid) {
            await fetch(`/api/bots/${bot.id}/refresh`, { method: "POST" });
          }
        }
      }
      await fetchStats();
    } finally {
      setSyncing(false);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "凌晨好";
    if (h < 12) return "上午好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  })();

  const today = new Date();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日星期${weekdays[today.getDay()]}`;

  const chartData = stats?.chartData || [];
  const maxMembers = Math.max(...chartData.map((d) => d.members), 1);

  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-[60px] border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <h1 className="text-lg font-semibold text-[#171d26]">总览</h1>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "同步中..." : "同步数据"}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Greeting */}
          <div>
            <div className="text-sm text-slate-500 mb-1">{dateStr}</div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold text-[#171d26]">
                {greeting}，{user?.username || "用户"}
              </h2>
              <span className="text-sm text-slate-400">
                共 {stats?.totalBots ?? 0} 个机器人，{stats?.onlineBots ?? 0} 个在线
              </span>
              {(stats?.onlineBots ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  运行中
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Bot className="h-4 w-4" />} label="机器人总数" value={stats?.totalBots ?? 0} />
            <StatCard icon={<Server className="h-4 w-4" />} label="服务器数量" value={stats?.totalServers ?? 0} />
            <StatCard icon={<Users className="h-4 w-4" />} label="总成员数" value={stats?.totalMembers ?? 0} />
            <StatCard icon={<Hash className="h-4 w-4" />} label="总频道数" value={stats?.totalChannels ?? 0} />
          </div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-[#171d26] mb-4">成员数变化趋势</h3>
              {chartData.length > 0 ? (
                <>
                  <div className="h-40 flex items-end justify-between gap-1">
                    {chartData.map((d, i) => {
                      const h = (d.members / maxMembers) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-blue-100 hover:bg-blue-300 rounded-t transition-colors group relative"
                          style={{ height: `${Math.max(h, 3)}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            {d.members}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                    <span>{chartData[0]?.date.slice(5) || ""}</span>
                    <span>{chartData[chartData.length - 1]?.date.slice(5) || ""}</span>
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-slate-400">暂无数据，点击右上角"同步数据"获取最新统计</p>
                </div>
              )}
            </div>

            {/* Bot list */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-[#171d26] mb-4">机器人概览</h3>
              <div className="space-y-3">
                {(stats?.bots || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    暂无机器人，请先
                    <a href="/bots" className="text-blue-600 hover:text-blue-500 ml-1">添加机器人</a>
                  </p>
                ) : (
                  (stats?.bots || []).map((bot, i) => (
                    <div key={bot.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-6">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {bot.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-[#171d26] block truncate">{bot.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {bot.lastSyncedAt ? `同步于 ${new Date(bot.lastSyncedAt).toLocaleString("zh-CN")}` : "未同步"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">
                          {bot.serverCount} 服务器 / {bot.memberCount} 成员
                        </span>
                        {bot.tokenValid ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            在线
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            离线
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#171d26] tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
