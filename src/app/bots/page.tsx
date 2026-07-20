"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Plus, Bot as BotIcon, Trash2, Power, PowerOff, Settings as SettingsIcon, RefreshCw } from "lucide-react";

interface BotData {
  id: string;
  botId: string;
  name: string;
  status: string;
  guildId: string;
  guildName: string;
  stats: { observe: number; send: number; gift: number };
  createdAt: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBot, setNewBot] = useState({ botId: "", name: "", token: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      setBots(data.bots || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBot),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "添加失败");
        return;
      }
      setShowAdd(false);
      setNewBot({ botId: "", name: "", token: "" });
      fetchBots();
    } catch {
      setError("网络错误");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个机器人吗？")) return;
    await fetch(`/api/bots/${id}`, { method: "DELETE" });
    fetchBots();
  };

  const handleToggleStatus = async (bot: BotData) => {
    const newStatus = bot.status === "online" ? "offline" : "online";
    await fetch(`/api/bots/${bot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchBots();
  };

  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        <div className="h-[60px] border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <h1 className="text-lg font-semibold text-[#171d26]">机器人</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            添加机器人
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400">加载中...</div>
          ) : bots.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <BotIcon className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 mb-4">还没有机器人</p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                + 添加第一个机器人
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bots.map((bot) => (
                <div key={bot.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {bot.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-[#171d26]">{bot.name}</div>
                        <div className="text-xs text-slate-500">ID: {bot.botId}</div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        bot.status === "online"
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          bot.status === "online" ? "bg-green-500" : "bg-slate-400"
                        }`}
                      />
                      {bot.status === "online" ? "在线" : "离线"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-gray-100">
                    <div>
                      <div className="text-xs text-slate-400">观察</div>
                      <div className="text-lg font-semibold text-[#171d26] tabular-nums">{bot.stats.observe}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">发送</div>
                      <div className="text-lg font-semibold text-[#171d26] tabular-nums">{bot.stats.send}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">礼物</div>
                      <div className="text-lg font-semibold text-[#171d26] tabular-nums">{bot.stats.gift}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/bots/${bot.id}`)}
                      className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors flex-1 justify-center"
                    >
                      <SettingsIcon className="h-3.5 w-3.5" />
                      配置
                    </button>
                    <button
                      onClick={() => handleToggleStatus(bot)}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        bot.status === "online"
                          ? "text-orange-600 hover:bg-orange-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {bot.status === "online" ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {bot.status === "online" ? "下线" : "上线"}
                    </button>
                    <button
                      onClick={() => handleDelete(bot.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add bot modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#171d26] mb-4">添加机器人</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">机器人名称</label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  placeholder="如：糖糖小助手"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">机器人 ID</label>
                <input
                  type="text"
                  value={newBot.botId}
                  onChange={(e) => setNewBot({ ...newBot, botId: e.target.value })}
                  placeholder="KOOK 机器人 ID"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bot Token</label>
                <input
                  type="password"
                  value={newBot.token}
                  onChange={(e) => setNewBot({ ...newBot, token: e.target.value })}
                  placeholder="KOOK 机器人 Token"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">在 KOOK 开发者平台获取 Bot Token</p>
              </div>
              {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 h-10 border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
