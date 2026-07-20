import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getBotGuilds } from "@/lib/kook";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const botId = req.nextUrl.searchParams.get("botId");
  if (!botId) return NextResponse.json({ error: "缺少 botId" }, { status: 400 });

  const bot = await getBotById(botId);
  if (!bot || bot.ownerId !== payload.id) {
    return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
  }

  try {
    const guilds = await getBotGuilds(bot.token);
    return NextResponse.json({ guilds });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
