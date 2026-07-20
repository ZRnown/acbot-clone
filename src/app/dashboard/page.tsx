"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { TrendingUp, Users, MessageSquare, Bot, LogIn, LogOut } from "lucide-react";

interface BotData {
  id: string;
  name: string;
  status: string;
  stats: { observe: number; send: number; gift: number };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [bots, setBots] = useState<BotData[]>([]);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      setBots(data.bots || []);
    } catch {
      // ignore
    }
  };

  const totalStats = bots.reduce(
    (acc, b) => ({
      observe: acc.observe + b.stats.observe,
      send: acc.send + b.stats.send,
      gift: acc.gift + b.stats.gift,
    }),
    { observe: 0, send: 0, gift: 0 }
  );

  const onlineBots = bots.filter((b) => b.status === "online").length;

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

  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-[60px] border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <h1 className="text-lg font-semibold text-[#171d26]">总览</h1>
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
                全部 {bots.length} 个机器人{onlineBots > 0 ? "运行正常" : "已离线"}
              </span>
              {onlineBots > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  全部在线
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="发言用户" value={0} />
            <StatCard icon={<MessageSquare className="h-4 w-4" />} label="消息量" value={totalStats.observe} />
            <StatCard icon={<Bot className="h-4 w-4" />} label="Bot发送" value={totalStats.send} />
            <StatCard icon={<LogIn className="h-4 w-4" />} label="进群" value={0} />
            <StatCard icon={<LogOut className="h-4 w-4" />} label="退群" value={0} />
          </div>

          {/* Recent activity placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-[#171d26] mb-4">近 14 天消息量</h3>
              <div className="h-40 flex items-end justify-between gap-1">
                {Array.from({ length: 14 }).map((_, i) => {
                  const h = Math.random() * 20 + 5;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-100 hover:bg-blue-200 rounded-t transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>14天前</span>
                <span>今天</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-[#171d26] mb-4">今日活跃榜</h3>
              <div className="space-y-3">
                {bots.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    暂无数据，请先
                    <a href="/bots" className="text-blue-600 hover:text-blue-500 ml-1">添加机器人</a>
                  </p>
                ) : (
                  bots.map((bot, i) => (
                    <div key={bot.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-6">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {bot.name[0]}
                      </div>
                      <span className="text-sm text-[#171d26] flex-1 truncate">{bot.name}</span>
                      <span className="text-xs text-slate-500">{bot.stats.observe} 条消息</span>
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
      <div className="text-2xl font-bold text-[#171d26] tabular-nums">{value}</div>
    </div>
  );
}
