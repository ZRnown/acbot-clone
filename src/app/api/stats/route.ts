import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotsByOwner } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const bots = await getBotsByOwner(payload.id);

  // Aggregate real stats from stored data
  const totalServers = bots.reduce((sum, b) => sum + (b.serverCount || 0), 0);
  const totalMembers = bots.reduce((sum, b) => sum + (b.memberCount || 0), 0);
  const totalChannels = bots.reduce((sum, b) => sum + (b.channelCount || 0), 0);
  const onlineBots = bots.filter((b) => b.status === "online" && b.tokenValid).length;
  const totalBots = bots.length;
  const validBots = bots.filter((b) => b.tokenValid).length;

  // Build chart data from statsHistory across all bots (aggregate by date)
  const dateMap: Record<string, { servers: number; members: number; channels: number; online: number }> = {};
  for (const bot of bots) {
    if (!bot.statsHistory) continue;
    for (const snap of bot.statsHistory) {
      const dateKey = snap.date.split("T")[0]; // YYYY-MM-DD
      if (!dateMap[dateKey]) dateMap[dateKey] = { servers: 0, members: 0, channels: 0, online: 0 };
      dateMap[dateKey].servers += snap.serverCount || 0;
      dateMap[dateKey].members += snap.memberCount || 0;
      dateMap[dateKey].channels += snap.channelCount || 0;
      dateMap[dateKey].online += snap.onlineUserCount || 0;
    }
  }

  // Sort by date and take last 14
  const chartData = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, data]) => ({ date, ...data }));

  return NextResponse.json({
    totalBots,
    onlineBots,
    validBots,
    totalServers,
    totalMembers,
    totalChannels,
    chartData,
    bots: bots.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      tokenValid: b.tokenValid,
      serverCount: b.serverCount || 0,
      memberCount: b.memberCount || 0,
      channelCount: b.channelCount || 0,
      onlineUserCount: b.onlineUserCount || 0,
      lastSyncedAt: b.lastSyncedAt,
    })),
  });
}
