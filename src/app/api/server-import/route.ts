import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getChannelList } from "@/lib/kook";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { botId, guildIdOrUrl } = body as {
      botId: string;
      guildIdOrUrl: string;
    };

    if (!botId || !guildIdOrUrl) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // Extract guild ID from URL or use directly
    let guildId = guildIdOrUrl.trim();
    // KOOK invite URL patterns: https://kookapp.cn/server/xxx or just the ID
    const urlMatch = guildId.match(/\/server\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      guildId = urlMatch[1];
    }
    // Remove any protocol prefix
    guildId = guildId.replace(/^https?:\/\//, "");

    // Get channel list from the source guild
    const channels = await getChannelList(bot.token, guildId);

    // Build structure: group channels by parent_id
    // type 1 = text, type 2 = voice
    const categories = channels.filter((c) => !c.parent_id || c.type === 0);
    const childChannels = channels.filter((c) => c.parent_id);

    // Build the template structure
    const structure = categories.map((cat) => {
      const children = childChannels.filter((c) => c.parent_id === cat.id);
      return {
        name: cat.name,
        channels: children.map((ch) => ({
          name: ch.name,
          type: ch.type,
          topic: ch.topic || "",
        })),
      };
    });

    // Also include channels without a parent that aren't categories
    const orphans = childChannels.filter(
      (c) => !categories.find((cat) => cat.id === c.parent_id)
    );
    if (orphans.length > 0 && structure.length === 0) {
      structure.push({
        name: "导入的频道",
        channels: orphans.map((ch) => ({
          name: ch.name,
          type: ch.type,
          topic: ch.topic || "",
        })),
      });
    }

    return NextResponse.json({
      success: true,
      guildId,
      structure,
      categoryCount: structure.length,
      channelCount: structure.reduce((sum, s) => sum + s.channels.length, 0),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
