"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  ChevronLeft,
  Wrench,
  Bot as BotIcon,
  RefreshCw,
  Power,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  MessageSquare,
  Shield,
  Smile,
  ArrowRight,
} from "lucide-react";

interface BotData {
  id: string;
  botId: string;
  name: string;
  status: string;
  guildId: string;
  guildName: string;
  stats: { observe: number; send: number; gift: number };
  config: { displayName: string; avatar: string; personality: string };
  migration: {
    sourceGuildId: string;
    targetGuildId: string;
    copyCategories: boolean;
    copyChannels: boolean;
    copyRoles: boolean;
    copyEmojis: boolean;
    copyPermissions: boolean;
    status: string;
    progress: number;
    log: { time: string; level: string; message: string }[];
  };
}

interface Guild {
  id: string;
  name: string;
  icon?: string;
}

type TabType = "basic" | "build";

export default function BotConfigPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("basic");
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [sourceGuild, setSourceGuild] = useState("");
  const [targetGuild, setTargetGuild] = useState("");
  const [copyOptions, setCopyOptions] = useState({
    copyCategories: true,
    copyChannels: true,
    copyRoles: true,
    copyEmojis: true,
    copyPermissions: true,
  });
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<{ time: string; level: string; message: string }[]>([]);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [guildsLoading, setGuildsLoading] = useState(false);

  const fetchBot = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setBot(data.bot);
        if (data.bot.migration) {
          setCopyOptions({
            copyCategories: data.bot.migration.copyCategories,
            copyChannels: data.bot.migration.copyChannels,
            copyRoles: data.bot.migration.copyRoles,
            copyEmojis: data.bot.migration.copyEmojis,
            copyPermissions: data.bot.migration.copyPermissions,
          });
          setSourceGuild(data.bot.migration.sourceGuildId || "");
          setTargetGuild(data.bot.migration.targetGuildId || "");
          setMigrationLog(data.bot.migration.log || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBot();
  }, [fetchBot]);

  const fetchGuilds = async () => {
    setGuildsLoading(true);
    try {
      const res = await fetch(`/api/kook/guilds?botId=${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setGuilds(data.guilds || []);
      } else {
        setError(data.error || "获取服务器列表失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setGuildsLoading(false);
    }
  };

  const handleSaveConfig = async (updates: Partial<BotData>) => {
    const res = await fetch(`/api/bots/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchBot();
    }
  };

  const handleToggleStatus = async () => {
    if (!bot) return;
    const newStatus = bot.status === "online" ? "offline" : "online";
    await fetch(`/api/bots/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchBot();
  };

  const handleMigrate = async () => {
    if (!sourceGuild || !targetGuild) {
      setError("请选择源服务器和目标服务器");
      return;
    }
    if (sourceGuild === targetGuild) {
      setError("源服务器和目标服务器不能相同");
      return;
    }

    setError("");
    setMigrating(true);
    setMigrationLog([]);
    setMigrationResult(null);

    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: params.id,
          sourceGuildId: sourceGuild,
          targetGuildId: targetGuild,
          ...copyOptions,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMigrationLog(data.log || []);
        setMigrationResult(data.result || data);
        if (!data.success && data.error) {
          setError(data.error);
        }
      } else {
        setError(data.error || "迁移失败");
      }
    } catch (e: any) {
      setError("网络错误: " + e.message);
    } finally {
      setMigrating(false);
      fetchBot();
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      </Sidebar>
    );
  }

  if (!bot) {
    return (
      <Sidebar>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          机器人不存在
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-[60px] border-b border-gray-200 flex items-center gap-4 px-6 bg-white">
          <button
            onClick={() => router.push("/bots")}
            className="flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回机器人列表
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">机器人</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-[#171d26]">{bot.name}</span>
          </div>
        </div>

        <div className="p-6">
          {/* Bot header card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {bot.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-[#171d26] text-lg">{bot.name}</div>
                  <div className="text-sm text-slate-500">ID: {bot.botId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                  bot.status === "online" ? "bg-green-50 text-green-600" : "bg-gray-100 text-slate-500"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${bot.status === "online" ? "bg-green-500" : "bg-slate-400"}`} />
                  {bot.status === "online" ? "运行中" : "已离线"}
                </span>
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-500">观察 <b className="text-[#171d26]">{bot.stats.observe}</b></span>
                  <span className="text-slate-500">发送 <b className="text-[#171d26]">{bot.stats.send}</b></span>
                  <span className="text-slate-500">礼物 <b className="text-[#171d26]">{bot.stats.gift}</b></span>
                </div>
                <button
                  onClick={handleToggleStatus}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    bot.status === "online"
                      ? "text-orange-600 bg-orange-50 hover:bg-orange-100"
                      : "text-green-600 bg-green-50 hover:bg-green-100"
                  }`}
                >
                  {bot.status === "online" ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  {bot.status === "online" ? "下线" : "上线"}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setTab("basic")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === "basic"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <BotIcon className="h-4 w-4" />
              基础
            </button>
            <button
              onClick={() => setTab("build")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === "build"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Wrench className="h-4 w-4" />
              服务器搭建
            </button>
          </div>

          {/* Basic tab */}
          {tab === "basic" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold text-[#171d26] mb-4">基础信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">显示名称</label>
                    <input
                      type="text"
                      value={bot.config.displayName}
                      onChange={(e) => setBot({ ...bot, config: { ...bot.config, displayName: e.target.value } })}
                      onBlur={() => handleSaveConfig({ config: { ...bot.config } })}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">头像地址</label>
                    <input
                      type="text"
                      value={bot.config.avatar}
                      onChange={(e) => setBot({ ...bot, config: { ...bot.config, avatar: e.target.value } })}
                      onBlur={() => handleSaveConfig({ config: { ...bot.config } })}
                      placeholder="https://..."
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">绑定服务器</label>
                    <p className="text-xs text-slate-400 mb-2">
                      选择机器人所在的 KOOK 服务器，其他功能的频道选择都依赖这里的绑定
                    </p>
                    <button
                      onClick={fetchGuilds}
                      className="flex items-center justify-between w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm hover:border-blue-400 transition-colors"
                    >
                      <span className={bot.guildId ? "text-[#171d26]" : "text-slate-400"}>
                        {bot.guildName || "选择服务器"}
                      </span>
                      <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${guildsLoading ? "animate-spin" : ""}`} />
                    </button>
                    {guilds.length > 0 && (
                      <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden">
                        {guilds.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              handleSaveConfig({ guildId: g.id, guildName: g.name });
                              setGuilds([]);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs">
                              {g.name[0]}
                            </div>
                            <span className="flex-1 truncate text-[#171d26]">{g.name}</span>
                            <span className="text-xs text-slate-400">{g.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">机器人性格描述</label>
                    <textarea
                      value={bot.config.personality}
                      onChange={(e) => setBot({ ...bot, config: { ...bot.config, personality: e.target.value } })}
                      onBlur={() => handleSaveConfig({ config: { ...bot.config } })}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Server build / migration tab */}
          {tab === "build" && (
            <div className="space-y-6 max-w-3xl">
              {/* Description */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Wrench className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#171d26] mb-1">服务器搭建工具</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      将源服务器的频道分类、子频道、角色权限和表情包一键复制到目标服务器。
                      机器人需要同时存在于源服务器和目标服务器中，并拥有「频道管理」「管理角色」「管理自定义表情」权限。
                    </p>
                  </div>
                </div>
              </div>

              {/* Guild selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#171d26]">选择服务器</h3>
                  <button
                    onClick={fetchGuilds}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-500"
                  >
                    <RefreshCw className={`h-3 w-3 ${guildsLoading ? "animate-spin" : ""}`} />
                    刷新服务器列表
                  </button>
                </div>

                {guilds.length === 0 ? (
                  <button
                    onClick={fetchGuilds}
                    className="w-full py-8 text-sm text-slate-400 hover:text-blue-600 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
                  >
                    点击加载机器人所在的服务器列表
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Source guild */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2">源服务器（从此复制）</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        {guilds.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setSourceGuild(g.id)}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                              sourceGuild === g.id
                                ? "bg-blue-50 text-blue-700"
                                : "hover:bg-gray-50 text-[#171d26]"
                            }`}
                          >
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs">
                              {g.name[0]}
                            </div>
                            <span className="flex-1 truncate">{g.name}</span>
                            {sourceGuild === g.id && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target guild */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2">目标服务器（复制到此）</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        {guilds.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setTargetGuild(g.id)}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                              targetGuild === g.id
                                ? "bg-green-50 text-green-700"
                                : "hover:bg-gray-50 text-[#171d26]"
                            }`}
                          >
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-green-400 to-teal-400 flex items-center justify-center text-white text-xs">
                              {g.name[0]}
                            </div>
                            <span className="flex-1 truncate">{g.name}</span>
                            {targetGuild === g.id && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {sourceGuild && targetGuild && (
                  <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-500">
                    <span>{guilds.find((g) => g.id === sourceGuild)?.name}</span>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                    <span>{guilds.find((g) => g.id === targetGuild)?.name}</span>
                  </div>
                )}
              </div>

              {/* Copy options */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-[#171d26] mb-4">复制选项</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CopyOption
                    icon={<Folder className="h-4 w-4" />}
                    label="频道分类"
                    desc="复制频道分组结构"
                    checked={copyOptions.copyCategories}
                    onChange={(v) => setCopyOptions({ ...copyOptions, copyCategories: v })}
                  />
                  <CopyOption
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="子频道"
                    desc="复制文字/语音频道"
                    checked={copyOptions.copyChannels}
                    onChange={(v) => setCopyOptions({ ...copyOptions, copyChannels: v })}
                  />
                  <CopyOption
                    icon={<Shield className="h-4 w-4" />}
                    label="角色"
                    desc="复制角色及权限设置"
                    checked={copyOptions.copyRoles}
                    onChange={(v) => setCopyOptions({ ...copyOptions, copyRoles: v })}
                  />
                  <CopyOption
                    icon={<Shield className="h-4 w-4" />}
                    label="频道权限"
                    desc="同步频道角色权限覆盖"
                    checked={copyOptions.copyPermissions}
                    onChange={(v) => setCopyOptions({ ...copyOptions, copyPermissions: v })}
                  />
                  <CopyOption
                    icon={<Smile className="h-4 w-4" />}
                    label="表情包"
                    desc="下载并上传自定义表情"
                    checked={copyOptions.copyEmojis}
                    onChange={(v) => setCopyOptions({ ...copyOptions, copyEmojis: v })}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={handleMigrate}
                disabled={migrating || !sourceGuild || !targetGuild}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {migrating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    正在搬运...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5" />
                    开始搬运
                  </>
                )}
              </button>

              {/* Migration log */}
              {migrationLog.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">迁移日志</h4>
                  <div className="space-y-1 font-mono text-xs">
                    {migrationLog.map((entry, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 ${
                          entry.level === "error"
                            ? "text-red-400"
                            : entry.level === "warn"
                            ? "text-yellow-400"
                            : entry.level === "success"
                            ? "text-green-400"
                            : "text-slate-300"
                        }`}
                      >
                        <span className="text-slate-600 shrink-0">
                          {new Date(entry.time).toLocaleTimeString()}
                        </span>
                        <span className="flex-1">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration result */}
              {migrationResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-[#171d26] mb-4 flex items-center gap-2">
                    {migrationResult.errors?.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    迁移结果
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResultItem label="分类" value={migrationResult.categories} />
                    <ResultItem label="频道" value={migrationResult.channels} />
                    <ResultItem label="角色" value={migrationResult.roles} />
                    <ResultItem label="表情" value={migrationResult.emojis} />
                  </div>
                  {migrationResult.errors?.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-orange-600 mb-2">
                        {migrationResult.errors.length} 个错误:
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {migrationResult.errors.map((err: string, i: number) => (
                          <p key={i} className="text-xs text-red-500">{err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}

function CopyOption({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        checked
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
        checked ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-slate-400"
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className={`text-sm font-medium ${checked ? "text-blue-700" : "text-[#171d26]"}`}>
          {label}
        </div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
      }`}>
        {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
      </div>
    </button>
  );
}

function ResultItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-[#171d26] tabular-nums">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
