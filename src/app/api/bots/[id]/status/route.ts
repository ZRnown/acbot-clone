import { NextRequest, NextResponse } from "next/server";
import { getBotById, updateBot, verifyToken } from "@/lib/db";
import { getBotInfo } from "@/lib/kook";
import { getBotRuntime, startBotRuntime, stopBotRuntime } from "@/lib/bot-runtime";

async function authorize(req: NextRequest, id: string) {
  const authToken = req.cookies.get("token")?.value;
  const payload = authToken ? verifyToken(authToken) : null;
  if (!payload) return null;
  const bot = await getBotById(id);
  return bot && bot.ownerId === payload.id ? bot : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await authorize(req, id);
  if (!bot) return NextResponse.json({ error: "机器人不存在或未登录" }, { status: 404 });
  return NextResponse.json({ runtime: getBotRuntime(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await authorize(req, id);
  if (!bot) return NextResponse.json({ error: "机器人不存在或未登录" }, { status: 404 });

  try {
    const body = (await req.json()) as { action?: "online" | "offline" };
    if (body.action === "online") {
      await getBotInfo(bot.token);
      const runtime = await startBotRuntime(id, bot.token);
      await updateBot(id, { status: "online", tokenValid: true });
      return NextResponse.json({ success: true, status: "online", runtime });
    }
    if (body.action === "offline") {
      const runtime = await stopBotRuntime(id);
      await updateBot(id, { status: "offline" });
      return NextResponse.json({ success: true, status: "offline", runtime });
    }
    return NextResponse.json({ error: "action 必须是 online 或 offline" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateBot(id, { status: "offline" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
