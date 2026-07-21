"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  ChevronLeft, Bot as BotIcon, RefreshCw, Power, PowerOff,
  CheckCircle2, AlertCircle, Loader2,
  Eye, Server, Image,
  Hash, Volume2,
  Hammer, Plus, Trash2, User,
} from "lucide-react";

interface BotData {
  id: string; botId: string; name: string; status: string;
  guildId: string; guildName: string;
  stats: { observe: number; send: number; gift: number };
  memberCount: number; channelCount: number; serverCount: number;
  config: { displayName: string; avatar: string };
  migration: {
    sourceGuildId: string; targetGuildId: string;
    copyCategories: boolean; copyChannels: boolean;
    copyRoles: boolean; copyEmojis: boolean; copyPermissions: boolean;
    status: string; progress: number;
    log: Array<{ time: string; level: string; message: string }>;
  };
}

interface GuildItem { id: string; name: string; icon?: string; }
interface EmojiItem { id: string; name: string; category: string; filename: string; }
interface EmojiCat { key: string; label: string; count: number; }
interface TplItem {
  id: string; name: string; description: string; source?: string;
  categoryCount?: number; channelCount?: number; groups?: number; channels?: number;
  categories?: TplCategory[];
}
interface TplCategory { name: string; channels: Array<{ name: string; type: number; topic?: string }>; }
interface BuildProg { status: string; progress: number; currentStep: string; log: Array<{ time: string; message: string }>; }

type TabKey = "basic" | "emoji" | "build";
type BuildRequestBody = {
  botId: string;
  guildId: string;
  structure?: TplCategory[];
  serverName?: string;
  duration?: string;
  sendWithUser?: boolean;
};

const TAB_LABELS: Record<TabKey, string> = {
  basic: "\u57fa\u672c\u4fe1\u606f",
  emoji: "\u8868\u60c5\u5e93",
  build: "\u670d\u52a1\u5668\u642d\u5efa",
};

const EMOJI_CAT: Record<string, string> = {
  all: "\u5168\u90e8", line: "\u5206\u5272\u7ebf", arrow: "\u7bad\u5934",
  star: "\u661f\u661f", heart: "\u7231\u5fc3", diamond: "\u94bb\u77f3",
  brand: "\u54c1\u724c", wing: "\u7fc5\u8180", other: "\u5176\u4ed6",
};

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [bot, setBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [tab, setTab] = useState<TabKey>("basic");

  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [selGuildId, setSelGuildId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [emojis, setEmojis] = useState<EmojiItem[]>([]);
  const [emojiCats, setEmojiCats] = useState<EmojiCat[]>([]);
  const [emojiFilter, setEmojiFilter] = useState("all");
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [emojiSelected, setEmojiSelected] = useState<Set<string>>(new Set());
  const [emojiUpGuildId, setEmojiUpGuildId] = useState("");
  const [emojiPrefix, setEmojiPrefix] = useState("");
  const [emojiUploading, setEmojiUploading] = useState(false);
  const [emojiUpResult, setEmojiUpResult] = useState<any>(null);

  const [templates, setTemplates] = useState<TplItem[]>([]);
  const [userTpls, setUserTpls] = useState<TplItem[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selTemplate, setSelTemplate] = useState<TplItem | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ structure: TplCategory[]; guildId: string } | null>(null);
  const [buildGuildId, setBuildGuildId] = useState("");
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildJobId, setBuildJobId] = useState<string | null>(null);
  const [buildProg, setBuildProg] = useState<BuildProg | null>(null);
  const [importStructure, setImportStructure] = useState<TplCategory[] | null>(null);
  const [builderServerName, setBuilderServerName] = useState("");
  const [builderCategories, setBuilderCategories] = useState<TplCategory[]>([]);
  const [buildDuration, setBuildDuration] = useState("fast");
  const [sendWithUser, setSendWithUser] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const fetchBot = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`/api/bots/${id}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "\u52a0\u8f7d\u5931\u8d25"); }
      const data = await res.json();
      setBot(data.bot);
      setDisplayName(data.bot.config?.displayName || data.bot.name || "");
      setAvatarUrl(data.bot.config?.avatar || "");
      setSelGuildId(data.bot.guildId || "");
      setLoading(false);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, [id]);

  useEffect(() => { fetchBot(); }, [fetchBot]);

  const fetchGuilds = useCallback(async () => {
    if (!bot) return;
    setGuildsLoading(true);
    try {
      const res = await fetch(`/api/kook/guilds?botId=${bot.id}`);
      if (res.ok) { const data = await res.json(); setGuilds(data.guilds || []); }
    } catch { /* ignore */ }
    finally { setGuildsLoading(false); }
  }, [bot]);

  useEffect(() => { fetchGuilds(); }, [fetchGuilds]);

  const fetchEmojiLib = useCallback(async () => {
    setEmojiLoading(true);
    try {
      const url = emojiFilter === "all"
        ? "/api/emoji-library"
        : `/api/emoji-library?category=${emojiFilter}`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setEmojis(data.emojis || []); setEmojiCats(data.categories || []); }
    } catch { /* ignore */ }
    finally { setEmojiLoading(false); }
  }, [emojiFilter]);

  useEffect(() => {
    if (tab === "emoji") fetchEmojiLib();
  }, [tab, emojiFilter, fetchEmojiLib]);

  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) { const data = await res.json(); setTemplates(data.presets || []); setUserTpls(data.userTemplates || []); }
    } catch { /* ignore */ }
    finally { setTplLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "build") fetchTemplates();
  }, [tab, fetchTemplates]);

  const saveConfig = async () => {
    setSavingCfg(true); setCfgMsg(null);
    try {
      const res = await fetch(`/api/bots/${id}/config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatar: avatarUrl, guildId: selGuildId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "\u4fdd\u5b58\u5931\u8d25"); }
      setCfgMsg({ ok: true, text: "\u914d\u7f6e\u5df2\u4fdd\u5b58" });
      fetchBot();
    } catch (e: any) { setCfgMsg({ ok: false, text: e.message }); }
    finally { setSavingCfg(false); }
  };

  const toggleStatus = async () => {
    if (!bot) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/bots/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("\u5207\u6362\u5931\u8d25");
      setBot(prev => prev ? { ...prev, status: prev.status === "online" ? "offline" : "online" } : null);
    } catch { /* ignore */ }
    finally { setToggling(false); }
  };

  const syncStats = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/bots/${id}/sync`, { method: "POST" });
      if (!res.ok) throw new Error("\u540c\u6b65\u5931\u8d25");
      fetchBot();
    } catch { /* ignore */ }
    finally { setSyncing(false); }
  };

  const toggleEmoji = (eid: string) => {
    setEmojiSelected(prev => { const n = new Set(prev); if (n.has(eid)) n.delete(eid); else n.add(eid); return n; });
  };
  const selectAllEmojis = () => setEmojiSelected(new Set(emojis.map(e => e.id)));
  const clearEmojiSelection = () => setEmojiSelected(new Set());

  const uploadEmojis = async () => {
    if (!bot || !emojiUpGuildId || emojiSelected.size === 0) return;
    setEmojiUploading(true); setEmojiUpResult(null);
    try {
      const res = await fetch("/api/emoji-library/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id, guildId: emojiUpGuildId, emojiIds: Array.from(emojiSelected), namePrefix: emojiPrefix || undefined }),
      });
      const data = await res.json();
      setEmojiUpResult(data);
      if (data.success && data.successCount > 0) setEmojiSelected(new Set());
    } catch (e: any) { setEmojiUpResult({ success: false, error: e.message }); }
    finally { setEmojiUploading(false); }
  };

  const importServer = async () => {
    if (!bot || !importUrl.trim()) return;
    setImportLoading(true); setImportResult(null);
    try {
      const res = await fetch("/api/server-import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id, guildIdOrUrl: importUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult({ structure: data.structure, guildId: data.guildId });
        setImportStructure(data.structure || []);
        setBuilderCategories(data.structure || []);
        setSelTemplate(null);
      }
    } catch { /* ignore */ }
    finally { setImportLoading(false); }
  };

  const applyTemplate = (tpl: TplItem) => {
    setSelTemplate(tpl);
    setImportResult(null);
    setImportStructure(null);
    setBuilderCategories((tpl.categories || []).map((cat) => ({
      name: cat.name,
      channels: cat.channels.map((ch) => ({ ...ch })),
    })));
  };

  const addCategory = () => {
    setBuilderCategories((prev) => [
      ...prev,
      { name: `新分组 ${prev.length + 1}`, channels: [{ name: "新频道", type: 1 }] },
    ]);
  };

  const updateCategoryName = (catIndex: number, name: string) => {
    setBuilderCategories((prev) => prev.map((cat, i) => i === catIndex ? { ...cat, name } : cat));
  };

  const removeCategory = (catIndex: number) => {
    setBuilderCategories((prev) => prev.filter((_, i) => i !== catIndex));
  };

  const addChannel = (catIndex: number) => {
    setBuilderCategories((prev) => prev.map((cat, i) => i === catIndex
      ? { ...cat, channels: [...cat.channels, { name: "新频道", type: 1 }] }
      : cat
    ));
  };

  const updateChannel = (
    catIndex: number,
    channelIndex: number,
    updates: Partial<TplCategory["channels"][number]>
  ) => {
    setBuilderCategories((prev) => prev.map((cat, i) => {
      if (i !== catIndex) return cat;
      return {
        ...cat,
        channels: cat.channels.map((ch, j) => j === channelIndex ? { ...ch, ...updates } : ch),
      };
    }));
  };

  const removeChannel = (catIndex: number, channelIndex: number) => {
    setBuilderCategories((prev) => prev.map((cat, i) => i === catIndex
      ? { ...cat, channels: cat.channels.filter((_, j) => j !== channelIndex) }
      : cat
    ));
  };

  const startBuild = async () => {
    if (!bot || !buildGuildId || !builderServerName.trim() || builderCategories.length === 0) return;
    setBuildLoading(true); setBuildProg(null); setBuildJobId(null);
    try {
      const body: BuildRequestBody = {
        botId: bot.id,
        guildId: buildGuildId,
        serverName: builderServerName.trim(),
        structure: builderCategories,
        duration: buildDuration,
        sendWithUser,
      };
      const res = await fetch("/api/server-build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      const jobId = data.jobId || data.buildId;
      if (jobId) { setBuildJobId(jobId); startPolling(jobId); }
      else setBuildLoading(false);
    } catch { setBuildLoading(false); }
  };

  const startPolling = (jobId: string) => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/server-build?buildId=${jobId}`);
        if (res.ok) {
          const d = await res.json();
          setBuildProg({
            status: d.status,
            progress: d.progress ?? (d.total ? d.current / d.total : 0),
            currentStep: d.currentStep || d.step || "",
            log: d.log || [],
          });
          if (d.status === "completed" || d.status === "failed") {
            clearInterval(poll);
            setBuildLoading(false);
          }
        }
      } catch { /* ignore */ }
    }, 1000);
    pollRef.current = poll;
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);


  if (loading) {
    return (
      <Sidebar>
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>
      </Sidebar>
    );
  }

  if (error || !bot) {
    return (
      <Sidebar>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-slate-300">{error || "\u672a\u627e\u5230\u673a\u5668\u4eba"}</p>
          <button onClick={() => router.push("/bots")} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition">\u8fd4\u56de\u5217\u8868</button>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="flex-1 flex flex-col min-w-0">

        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <button onClick={() => router.push("/bots")} className="p-1.5 rounded-lg text-slate-400 hover:text-[#171d26] hover:bg-slate-100 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            {bot.config?.avatar ? <img src={bot.config.avatar} className="w-full h-full rounded-xl object-cover" alt="" /> : <BotIcon className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-[#171d26] truncate">{bot.config?.displayName || bot.name}</h1>
            <p className="text-xs text-slate-500 truncate">{bot.guildName || "未绑定"} · {bot.memberCount || 0} 成员</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncStats} disabled={syncing} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition disabled:opacity-50" title="同步数据">
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={toggleStatus} disabled={toggling}
              className={`p-2 rounded-lg transition disabled:opacity-50 ${bot.status === "online" ? "text-green-600 hover:text-green-500 hover:bg-green-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
              title={bot.status === "online" ? "线上 · 点击下线" : "离线 · 点击上线"}
            >
              {bot.status === "online" ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <nav className="flex gap-0 px-6 border-b border-gray-200 bg-white shrink-0">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === k ? "border-blue-600 text-blue-600 bg-blue-50/60" : "border-transparent text-slate-500 hover:text-[#171d26] hover:border-gray-300"}`}
            >{TAB_LABELS[k]}</button>
          ))}
        </nav>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">

          {tab === "basic" && (
            <div className="max-w-4xl space-y-5">

              <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[#171d26] mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-blue-600" />服务器绑定</h2>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">选择服务器</label>
                  {guildsLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" />加载中...</div>
                  ) : guilds.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">暂无可用服务器，点击右上角同步刷新</p>
                  ) : (
                    <select value={selGuildId} onChange={(e) => setSelGuildId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#171d26] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition">
                      <option value="">-- 未绑定 --</option>
                      {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                    </select>
                  )}
                </div>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[#171d26] mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-600" />展示设置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">显示名称</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={bot.name}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#171d26] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">头像 URL</label>
                    <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#171d26] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition" />
                  </div>
                </div>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[#171d26] mb-4">机器人信息</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-50 border border-gray-200 rounded-lg p-4"><p className="text-2xl font-bold text-[#171d26]">{bot.memberCount || 0}</p><p className="text-xs text-slate-500 mt-1">成员</p></div>
                  <div className="bg-slate-50 border border-gray-200 rounded-lg p-4"><p className="text-2xl font-bold text-[#171d26]">{bot.channelCount || 0}</p><p className="text-xs text-slate-500 mt-1">频道</p></div>
                  <div className="bg-slate-50 border border-gray-200 rounded-lg p-4"><p className="text-2xl font-bold text-[#171d26]">{bot.serverCount || 0}</p><p className="text-xs text-slate-500 mt-1">服务器</p></div>
                </div>
              </section>

              <div className="flex items-center gap-3">
                <button onClick={saveConfig} disabled={savingCfg}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition flex items-center gap-2">
                  {savingCfg && <Loader2 className="w-4 h-4 animate-spin" />}保存配置
                </button>
                {cfgMsg && (
                  <span className={`text-sm ${cfgMsg.ok ? "text-green-600" : "text-red-600"}`}>
                    {cfgMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}{cfgMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}


          {tab === "emoji" && (
            <div className="space-y-5">

              <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                {(Object.keys(EMOJI_CAT) as string[]).map((cat) => (
                  <button key={cat} onClick={() => setEmojiFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${emojiFilter === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#171d26]"}`}
                  >{EMOJI_CAT[cat]}</button>
                ))}
                <div className="flex-1" />
                <button onClick={selectAllEmojis} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#171d26] transition">全选</button>
                <button onClick={clearEmojiSelection} className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#171d26] transition">清除</button>
                <span className="text-xs text-slate-500">{emojiSelected.size} 已选</span>
              </div>

              {emojiLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
              ) : emojis.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl text-center py-14 text-slate-500 shadow-sm">
                  <Image className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-[#171d26]">该分类暂无表情</p>
                  <p className="text-xs text-slate-500 mt-1">换个分类看看，或稍后再回来选择。</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {emojis.map((emoji) => {
                    const sel = emojiSelected.has(emoji.id);
                    const thumbUrl = `/api/emoji-library/thumb/${emoji.category}/${emoji.id}`;
                    return (
                      <button key={emoji.id} onClick={() => toggleEmoji(emoji.id)}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all bg-white ${sel ? "border-blue-500 ring-2 ring-blue-500/20 scale-95" : "border-gray-200 hover:border-blue-300"}`}
                        title={emoji.name}
                      >
                        <img src={thumbUrl} alt={emoji.name} className="w-full h-full object-contain bg-slate-50" />
                        {sel && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {emojiSelected.size > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#171d26]">上传到服务器</h3>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">目标服务器</label>
                      <select value={emojiUpGuildId} onChange={(e) => setEmojiUpGuildId(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#171d26] focus:outline-none focus:border-blue-500">
                        <option value="">-- 选择服务器 --</option>
                        {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">名称前缀（可选）</label>
                      <input type="text" value={emojiPrefix} onChange={(e) => setEmojiPrefix(e.target.value)} placeholder="例: mybot_"
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#171d26] w-32 focus:outline-none focus:border-blue-500" />
                    </div>
                    <button onClick={uploadEmojis} disabled={emojiUploading || !emojiUpGuildId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition flex items-center gap-2">
                      {emojiUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {emojiUploading ? "上传中..." : `上传 ${emojiSelected.size} 个表情`}
                    </button>
                  </div>

                  {emojiUpResult && (
                    <div className={`p-3 rounded-lg text-sm ${emojiUpResult.success !== false ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      {emojiUpResult.results ? (
                        <div>
                          <p className="font-medium mb-1">\u5b8c\u6210: {emojiUpResult.successCount}/{emojiUpResult.total} \u6210\u529f</p>
                          {emojiUpResult.results.filter((r: any) => !r.success).length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                              {emojiUpResult.results.filter((r: any) => !r.success).map((r: any) => (
                                <p key={r.id} className="text-xs text-red-400">{r.name}: {r.error}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-red-400">{emojiUpResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {tab === "build" && (
            <div className="space-y-4 max-w-4xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
                      <Hammer className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-800 leading-tight">一键搭建服务器</div>
                      <div className="text-[11px] text-gray-400">选服务器 → 套模板 → 调结构 → 发布，全程可视化</div>
                    </div>
                  </div>

                  <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                      准备
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-600">选择目标服务器</div>
                      <select value={buildGuildId} onChange={(e) => setBuildGuildId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400">
                        <option value="">请选择</option>
                        {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-600">服务器名称</div>
                      <input type="text" value={builderServerName} onChange={(e) => setBuilderServerName(e.target.value)}
                        placeholder="例如：知你电竞"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                      <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        导入服务器
                        <span className="text-[11px] text-slate-500 font-normal">粘贴 KOOK 服务器链接或 ID，自动拉取频道结构进编辑器</span>
                      </div>
                      <div className="flex gap-2">
                        <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                          placeholder="粘贴服务器链接或 guildId"
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                        <button onClick={importServer} disabled={importLoading || !importUrl.trim()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shrink-0">
                          {importLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          导入
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                      频道结构
                    </div>
                    {tplLoading ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" />模板加载中...</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {templates.map((tpl) => (
                          <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                            className={`text-left p-2.5 rounded-lg border transition-all text-xs ${selTemplate?.id === tpl.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-100" : "border-gray-200 hover:border-blue-300"}`}>
                            <div className="font-medium text-sm truncate">{tpl.name}</div>
                            <div className="text-slate-500 mt-0.5 line-clamp-2">{tpl.description}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-gray-700">
                          结构编辑器
                          <span className="ml-2 font-normal text-slate-400">{builderCategories.length} 分组 / {builderCategories.reduce((sum, cat) => sum + cat.channels.length, 0)} 频道</span>
                        </div>
                        <button onClick={addCategory} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-xs text-blue-600 hover:border-blue-300">
                          <Plus className="h-3.5 w-3.5" />添加分组
                        </button>
                      </div>

                      {builderCategories.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
                          <div className="text-sm font-medium text-gray-700">还没有频道结构</div>
                          <div className="text-xs text-slate-400 mt-1">选择上方模板，或手动添加分组和频道。</div>
                          <button onClick={addCategory} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                            <Plus className="h-3.5 w-3.5" />手动配置
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                          {builderCategories.map((cat, catIndex) => (
                            <div key={catIndex} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <input value={cat.name} onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                                  className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-400" />
                                <button onClick={() => addChannel(catIndex)} className="rounded-md border border-gray-200 p-1.5 text-blue-600 hover:border-blue-300" title="添加频道"><Plus className="h-4 w-4" /></button>
                                <button onClick={() => removeCategory(catIndex)} className="rounded-md border border-gray-200 p-1.5 text-red-500 hover:border-red-200" title="删除分组"><Trash2 className="h-4 w-4" /></button>
                              </div>
                              <div className="space-y-1.5">
                                {cat.channels.map((ch, channelIndex) => (
                                  <div key={channelIndex} className="flex items-center gap-2">
                                    <select value={ch.type} onChange={(e) => updateChannel(catIndex, channelIndex, { type: Number(e.target.value) })}
                                      className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                                      <option value={1}>文字</option>
                                      <option value={2}>语音</option>
                                    </select>
                                    <span className="text-slate-400">{ch.type === 2 ? <Volume2 className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}</span>
                                    <input value={ch.name} onChange={(e) => updateChannel(catIndex, channelIndex, { name: e.target.value })}
                                      className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                                    <button onClick={() => removeChannel(catIndex, channelIndex)} className="rounded-md border border-gray-200 p-1.5 text-red-500 hover:border-red-200" title="删除频道"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500 text-white text-xs font-bold">✓</span>确认搭建</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-slate-500">服务器</div><div>{guilds.find((g) => g.id === buildGuildId)?.name || "未选择"}</div>
                      <div className="text-slate-500">名称</div><div>{builderServerName || "未填写"}</div>
                      <div className="text-slate-500">模板</div><div>{selTemplate?.name || (importResult ? "导入结构" : "手动配置")}</div>
                      <div className="text-slate-500">频道结构</div><div>{builderCategories.length} 分组 / {builderCategories.reduce((sum, cat) => sum + cat.channels.length, 0)} 频道</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs"><User className="h-3.5 w-3.5 text-gray-500" /><span className="font-medium">用个人号发导航</span><span className="text-slate-500">（客户看到的是真人发的消息）</span></div>
                        <button onClick={() => setSendWithUser((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${sendWithUser ? "bg-blue-500" : "bg-gray-300"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sendWithUser ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs"><span className="font-medium">搭建时长</span><span className="text-slate-500">（不选则尽快完成）</span></div>
                      <div className="flex gap-2 flex-wrap">
                        {[["fast", "尽快"], ["1", "1 分钟"], ["3", "3 分钟"], ["5", "5 分钟"], ["10", "10 分钟"]].map(([value, label]) => (
                          <button key={value} onClick={() => setBuildDuration(value)}
                            className={`px-3 py-1 rounded-lg text-xs border transition-colors ${buildDuration === value ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={startBuild} disabled={buildLoading || !buildGuildId || !builderServerName.trim() || builderCategories.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] text-white h-10 px-4 py-2 bg-blue-600 hover:bg-blue-700 w-full">
                      {buildLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                      {buildLoading ? "搭建中..." : "开始搭建"}
                    </button>
                    {(!buildGuildId || !builderServerName.trim() || builderCategories.length === 0) && (
                      <div className="text-[11px] text-amber-600 text-center">请先选择服务器、填写名称，并配置频道结构</div>
                    )}
                  </section>

                  {buildProg && (
                    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[#171d26]">进度日志</h2>{buildJobId && <span className="text-xs text-slate-500">{buildJobId}</span>}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 rounded-full ${buildProg.status === "completed" ? "bg-emerald-500" : buildProg.status === "failed" ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${Math.round(buildProg.progress * 100)}%` }} /></div>
                        <span className="text-xs text-slate-500 w-10 text-right">{Math.round(buildProg.progress * 100)}%</span>
                      </div>
                      <p className="text-sm text-slate-600">{buildProg.currentStep}</p>
                      <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-gray-200 bg-slate-50 p-3">
                        {buildProg.log?.map((l, i) => (<p key={i} className="text-xs text-slate-500 font-mono leading-5">{l.time} {l.message}</p>))}
                      </div>
                    </section>
                  )}
                </div>
            </div>
          )}



        </div>
      </div>
    </Sidebar>
  );
}
