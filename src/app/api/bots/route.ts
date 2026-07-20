import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotsByOwner, createBot } from "@/lib/db";

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

    const bot = await createBot(payload.id, {
      botId,
      name,
      token: botToken,
    });

    return NextResponse.json({
      success: true,
      bot: { ...bot, token: "***" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
