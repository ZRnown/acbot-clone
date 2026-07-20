import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotsByOwner, createBot } from "@/lib/db";
import { getBotInfo } from "@/lib/kook";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const bots = await getBotsByOwner(payload.id);
  // Don't expose tokens
  const safeBots = bots.map((b) => ({ ...b, token: b.token ? "***" : "" }));
  return NextResponse.json({ bots: safeBots });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { botId, name, token: botToken } = body;

    if (!botId || !name || !botToken) {
      return NextResponse.json({ error: "缺少必填字段: botId, name, token" }, { status: 400 });
    }

    // Verify the token is valid via KOOK API before saving
    let botInfo;
    try {
      botInfo = await getBotInfo(botToken);
    } catch {
      return NextResponse.json({ error: "Token 无效，无法连接到 KOOK API。请检查 Token 是否正确。" }, { status: 400 });
    }

    // Use the real bot name from KOOK if name not provided
    const realName = name || botInfo.username || "未命名机器人";

    const bot = await createBot(payload.id, {
      botId,
      name: realName,
      token: botToken,
    });

    // Mark token as valid immediately
    const { updateBot } = await import("@/lib/db");
    await updateBot(bot.id, { tokenValid: true, status: "online" });

    return NextResponse.json({
      success: true,
      bot: { ...bot, token: "***", tokenValid: true, status: "online" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
