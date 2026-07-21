"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  ChevronLeft, Wrench, Bot as BotIcon, RefreshCw, Power, PowerOff,
  CheckCircle2, AlertCircle, Loader2,
  Upload, Eye, Server, Play, Copy, Image, Clock,
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
  categoryCount: number; channelCount: number;
}
interface TplCategory { name: string; channels: Array<{ name: string; type: number; topic?: string }>; }
interface BuildProg { status: string; progress: number; currentStep: string; log: Array<{ time: string; message: string }>; }

type TabKey = "basic" | "emoji" | "build";

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
      if (data.success) setImportResult({ structure: data.structure, guildId: data.guildId });
    } catch { /* ignore */ }
    finally { setImportLoading(false); }
  };

  const startBuild = async () => {
    if (!bot || !buildGuildId) return;
    setBuildLoading(true); setBuildProg(null); setBuildJobId(null);
    try {
      const body: any = { botId: bot.id, guildId: buildGuildId };
      if (selTemplate) body.templateId = selTemplate.id;
      else if (importResult) body.structure = importResult.structure;
      const res = await fetch("/api/server-build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.jobId) { setBuildJobId(data.jobId); startPolling(data.jobId); }
    } catch { setBuildLoading(false); }
  };

  const startPolling = (jobId: string) => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/server-build?jobId=${jobId}`);
        if (res.ok) { const d = await res.json(); setBuildProg(d); if (d.status === "completed" || d.status === "failed") { clearInterval(poll); setBuildLoading(false); } }
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

        <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/60 bg-[#0d1319] shrink-0">
          <button onClick={() => router.push("/bots")} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            {bot.config?.avatar ? <img src={bot.config.avatar} className="w-full h-full rounded-xl object-cover" alt="" /> : <BotIcon className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">{bot.config?.displayName || bot.name}</h1>
            <p className="text-xs text-slate-500 truncate">{bot.guildName || "\u672a\u7ed1\u5b9a"} \u00b7 {bot.memberCount || 0} \u6210\u5458</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncStats} disabled={syncing} className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition disabled:opacity-50" title="\u540c\u6b65\u6570\u636e">
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={toggleStatus} disabled={toggling}
              className={`p-2 rounded-lg transition disabled:opacity-50 ${bot.status === "online" ? "text-green-400 hover:text-green-300 hover:bg-green-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
              title={bot.status === "online" ? "\u7ebf\u4e0a \u00b7 \u70b9\u51fb\u4e0b\u7ebf" : "\u79bb\u7ebf \u00b7 \u70b9\u51fb\u4e0a\u7ebf"}
            >
              {bot.status === "online" ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <nav className="flex gap-0 px-6 border-b border-slate-800/60 bg-[#0d1319] shrink-0">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === k ? "border-indigo-500 text-indigo-400 bg-indigo-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"}`}
            >{TAB_LABELS[k]}</button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">

          {tab === "basic" && (
            <div className="max-w-2xl space-y-6">

              <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-indigo-400" />\u670d\u52a1\u5668\u7ed1\u5b9a</h2>
                <div>
                  <label className="text-xs text-slate-500">\u9009\u62e9\u670d\u52a1\u5668</label>
                  {guildsLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" />\u52a0\u8f7d\u4e2d...</div>
                  ) : guilds.length === 0 ? (
                    <p className="text-sm text-slate-600 py-2">\u6682\u65e0\u53ef\u7528\u670d\u52a1\u5668\uff0c\u70b9\u51fb\u540c\u6b65\u5237\u65b0</p>
                  ) : (
                    <select value={selGuildId} onChange={(e) => setSelGuildId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition">
                      <option value="">-- \u672a\u7ed1\u5b9a --</option>
                      {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                    </select>
                  )}
                </div>
              </section>

              <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-400" />\u5c55\u793a\u8bbe\u7f6e</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">\u663e\u793a\u540d\u79f0</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={bot.name}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">\u5934\u50cf URL</label>
                    <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition" />
                  </div>
                </div>
              </section>

              <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">\u673a\u5668\u4eba\u4fe1\u606f</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-800/60 rounded-lg p-3"><p className="text-2xl font-bold text-white">{bot.memberCount || 0}</p><p className="text-xs text-slate-500 mt-1">\u6210\u5458</p></div>
                  <div className="bg-slate-800/60 rounded-lg p-3"><p className="text-2xl font-bold text-white">{bot.channelCount || 0}</p><p className="text-xs text-slate-500 mt-1">\u9891\u9053</p></div>
                  <div className="bg-slate-800/60 rounded-lg p-3"><p className="text-2xl font-bold text-white">{bot.serverCount || 0}</p><p className="text-xs text-slate-500 mt-1">\u670d\u52a1\u5668</p></div>
                </div>
              </section>

              <div className="flex items-center gap-3">
                <button onClick={saveConfig} disabled={savingCfg}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition flex items-center gap-2">
                  {savingCfg && <Loader2 className="w-4 h-4 animate-spin" />}\u4fdd\u5b58\u914d\u7f6e
                </button>
                {cfgMsg && (
                  <span className={`text-sm ${cfgMsg.ok ? "text-green-400" : "text-red-400"}`}>
                    {cfgMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}{cfgMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}


          {tab === "emoji" && (
            <div className="space-y-5">

              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(EMOJI_CAT) as string[]).map((cat) => (
                  <button key={cat} onClick={() => setEmojiFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${emojiFilter === cat ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                  >{EMOJI_CAT[cat]}</button>
                ))}
                <div className="flex-1" />
                <button onClick={selectAllEmojis} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">\u5168\u9009</button>
                <button onClick={clearEmojiSelection} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">\u6e05\u9664</button>
                <span className="text-xs text-slate-600">{emojiSelected.size} \u5df2\u9009</span>
              </div>

              {emojiLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
              ) : emojis.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <Image className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">\u8be5\u5206\u7c7b\u6682\u65e0\u8868\u60c5\uff0c\u8bf7\u5c06\u56fe\u7247\u653e\u5165 public/emoji-library/ \u76ee\u5f55</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {emojis.map((emoji) => {
                    const sel = emojiSelected.has(emoji.id);
                    const thumbUrl = `/api/emoji-library/thumb/${emoji.category}/${emoji.id}`;
                    return (
                      <button key={emoji.id} onClick={() => toggleEmoji(emoji.id)}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${sel ? "border-indigo-500 ring-2 ring-indigo-500/30 scale-95" : "border-transparent hover:border-slate-600"}`}
                        title={emoji.name}
                      >
                        <img src={thumbUrl} alt={emoji.name} className="w-full h-full object-contain bg-slate-800/80" />
                        {sel && (
                          <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {emojiSelected.size > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300">\u4e0a\u4f20\u5230\u670d\u52a1\u5668</h3>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">\u76ee\u6807\u670d\u52a1\u5668</label>
                      <select value={emojiUpGuildId} onChange={(e) => setEmojiUpGuildId(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                        <option value="">-- \u9009\u62e9\u670d\u52a1\u5668 --</option>
                        {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">\u540d\u79f0\u524d\u7f00 (\u53ef\u9009)</label>
                      <input type="text" value={emojiPrefix} onChange={(e) => setEmojiPrefix(e.target.value)} placeholder="\u4f8b: mybot_"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 w-32 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button onClick={uploadEmojis} disabled={emojiUploading || !emojiUpGuildId}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition flex items-center gap-2">
                      {emojiUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {emojiUploading ? "\u4e0a\u4f20\u4e2d..." : `\u4e0a\u4f20 ${emojiSelected.size} \u4e2a\u8868\u60c5`}
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
            <div className="space-y-5 max-w-3xl">

              <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Copy className="w-4 h-4 text-indigo-400" />\u9009\u62e9\u6a21\u677f\u6216\u5bfc\u5165</h2>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 mb-2 block">\u9884\u8bbe\u6a21\u677f</label>
                  {tplLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" />\u52a0\u8f7d\u4e2d...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {templates.map((tpl) => (
                        <button key={tpl.id} onClick={() => { setSelTemplate(tpl); setImportResult(null); }}
                          className={`text-left p-3 rounded-lg border transition ${selTemplate?.id === tpl.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-slate-500 bg-slate-800/60"}`}
                        >
                          <p className="text-sm font-medium text-slate-200 truncate">{tpl.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tpl.description}</p>
                          <div className="flex gap-3 mt-1.5 text-xs text-slate-600"><span>{tpl.categoryCount} \u5206\u7c7b</span><span>{tpl.channelCount} \u9891\u9053</span></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <label className="text-xs text-slate-500 mb-2 block">\u6216\u4ece KOOK \u670d\u52a1\u5668\u5bfc\u5165</label>
                  <div className="flex gap-2">
                    <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="\u670d\u52a1\u5668\u94fe\u63a5\u6216 ID"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                    <button onClick={importServer} disabled={importLoading || !importUrl.trim()}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium text-slate-200 transition flex items-center gap-2">
                      {importLoading && <Loader2 className="w-4 h-4 animate-spin" />}\u5bfc\u5165
                    </button>
                  </div>
                  {importResult && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                      \u5df2\u5bfc\u5165 {importResult.structure.length} \u4e2a\u5206\u7c7b\uff0c\u5171\u8ba1 {importResult.structure.reduce((s: number, c: any) => s + c.channels.length, 0)} \u4e2a\u9891\u9053
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Play className="w-4 h-4 text-indigo-400" />\u6267\u884c\u642d\u5efa</h2>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">\u76ee\u6807\u670d\u52a1\u5668</label>
                    <select value={buildGuildId} onChange={(e) => setBuildGuildId(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option value="">-- \u9009\u62e9\u670d\u52a1\u5668 --</option>
                      {guilds.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                    </select>
                  </div>
                  <button onClick={startBuild} disabled={buildLoading || !buildGuildId || (!selTemplate && !importResult)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition flex items-center gap-2">
                    {buildLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {buildLoading ? "\u642d\u5efa\u4e2d..." : "\u5f00\u59cb\u642d\u5efa"}
                  </button>
                </div>

                {buildProg && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 rounded-full ${buildProg.status === "completed" ? "bg-green-500" : buildProg.status === "failed" ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${Math.round(buildProg.progress * 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{Math.round(buildProg.progress * 100)}%</span>
                    </div>
                    <p className="text-sm text-slate-400">{buildProg.currentStep}</p>
                    {buildProg.log && buildProg.log.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-800/50 rounded-lg p-3">
                        {buildProg.log.map((l: any, i: number) => (<p key={i} className="text-xs text-slate-500 font-mono">{l.time} {l.message}</p>))}
                      </div>
                    )}
                    {buildProg.status === "completed" && (
                      <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" />\u670d\u52a1\u5668\u642d\u5efa\u5b8c\u6210\uff01</div>
                    )}
                    {buildProg.status === "failed" && (
                      <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />\u642d\u5efa\u5931\u8d25</div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

        </div>
      </div>
    </Sidebar>
  );
}
