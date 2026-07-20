import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById, syncBotStats, updateBot } from "@/lib/db";
import { getBotInfo, getBotStats } from "@/lib/kook";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const { id } = await params;
  const bot = await getBotById(id);
  if (!bot || bot.ownerId !== payload.id) {
    return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
  }

  try {
    // First verify token is still valid
    try {
      await getBotInfo(bot.token);
    } catch {
      await updateBot(id, { tokenValid: false, status: "offline" });
      return NextResponse.json({ error: "Token 已失效，请重新配置机器人 Token" }, { status: 400 });
    }

    // Fetch real stats from KOOK
    const stats = await getBotStats(bot.token);

    // Save to DB with snapshot
    const updated = await syncBotStats(id, {
      serverCount: stats.serverCount,
      memberCount: stats.memberCount,
      channelCount: stats.channelCount,
      onlineUserCount: stats.guildDetails.reduce((sum, g) => sum + g.onlineUserCount, 0),
    });

    return NextResponse.json({
      success: true,
      bot: { ...updated, token: "***" },
      stats: {
        serverCount: stats.serverCount,
        memberCount: stats.memberCount,
        channelCount: stats.channelCount,
        onlineUserCount: stats.guildDetails.reduce((sum, g) => sum + g.onlineUserCount, 0),
        guildDetails: stats.guildDetails,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
