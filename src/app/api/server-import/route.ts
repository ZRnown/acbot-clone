import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getAllEmojis, getChannelList, getGuild } from "@/lib/kook";

type ImportedEmoji = { name: string; url: string };

function parseGuildId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:\/server\/|\/)([a-zA-Z0-9]{4,})\/?(?:\?.*)?$/);
  return match?.[1] || trimmed.replace(/^https?:\/\//, "");
}

async function scanWithAcbot(guildId: string) {
  const username = process.env.ACBOT_IMPORT_USERNAME;
  const password = process.env.ACBOT_IMPORT_PASSWORD;
  if (!username || !password) return null;

  const loginRes = await fetch("https://acbot.top/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!loginRes.ok) throw new Error(`ACBot \u626b\u63cf\u767b\u5f55\u5931\u8d25 (${loginRes.status})`);
  const login = await loginRes.json();
  if (!login.token) throw new Error("ACBot \u626b\u63cf\u767b\u5f55\u672a\u8fd4\u56de\u4ee4\u724c");

  const scanRes = await fetch("https://acbot.top/api/server-builder/import-scan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${login.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ link: guildId }),
    cache: "no-store",
  });
  const data = await scanRes.json();
  if (!scanRes.ok || !data.ok) {
    throw new Error(data.error || `ACBot \u626b\u63cf\u5931\u8d25 (${scanRes.status})`);
  }
  return {
    guildId: data.guildId || guildId,
    sourceGuildId: data.sourceGuildId || guildId,
    guildName: data.guildName || "",
    structure: data.categories || [],
    nav: data.nav || null,
    emojis: (data.emojis || []) as ImportedEmoji[],
    categoryCount: data.catCount ?? data.categories?.length ?? 0,
    channelCount: data.chCount ?? (data.categories || []).reduce(
      (sum: number, category: { channels?: unknown[] }) => sum + (category.channels?.length || 0), 0
    ),
    scanMode: "account",
  };
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "\u672a\u767b\u5f55" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "\u767b\u5f55\u5df2\u8fc7\u671f" }, { status: 401 });

  try {
    const { botId, guildIdOrUrl } = await req.json() as { botId: string; guildIdOrUrl: string };
    if (!botId || !guildIdOrUrl) {
      return NextResponse.json({ error: "\u7f3a\u5c11\u53c2\u6570" }, { status: 400 });
    }
    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "\u65e0\u6743\u64cd\u4f5c" }, { status: 403 });
    }

    const guildId = parseGuildId(guildIdOrUrl);
    try {
      const accountScan = await scanWithAcbot(guildId);
      if (accountScan) return NextResponse.json({ success: true, ...accountScan });
    } catch (error) {
      console.error("Account import scan failed, using bot API fallback:", error);
    }

    const [channels, guild, emojiItems] = await Promise.all([
      getChannelList(bot.token, guildId),
      getGuild(bot.token, guildId),
      getAllEmojis(bot.token, guildId).catch(() => []),
    ]);
    const categories = channels.filter((channel) => channel.type === 0);
    const categoryIds = new Set(categories.map((category) => category.id));
    const ungrouped = channels.filter(
      (channel) => channel.type !== 0 && (!channel.parent_id || !categoryIds.has(channel.parent_id))
    );
    const structure = categories.map((category) => ({
      name: category.name,
      channels: channels
        .filter((channel) => channel.type !== 0 && channel.parent_id === category.id)
        .map((channel) => ({ name: channel.name, type: channel.type, topic: channel.topic || "" })),
    }));
    if (ungrouped.length) {
      structure.unshift({
        name: "\u672a\u5206\u7ec4\u9891\u9053",
        channels: ungrouped.map((channel) => ({
          name: channel.name, type: channel.type, topic: channel.topic || "",
        })),
      });
    }
    const emojis = emojiItems.map((emoji) => ({
      name: emoji.name,
      url: `https://img.kookapp.cn/emojis/${guildId}/${emoji.id}`,
    }));
    return NextResponse.json({
      success: true,
      guildId,
      sourceGuildId: guildId,
      guildName: guild.name,
      structure,
      nav: null,
      emojis,
      categoryCount: structure.length,
      channelCount: structure.reduce((sum, category) => sum + category.channels.length, 0),
      scanMode: "bot",
      warning: "\u673a\u5668\u4eba API \u53ea\u80fd\u5bfc\u5165\u8be5\u673a\u5668\u4eba\u6709\u6743\u67e5\u770b\u7684\u9891\u9053\u3002",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
