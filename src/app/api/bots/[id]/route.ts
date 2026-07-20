import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById, updateBot, deleteBot } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const { id } = await params;
  const bot = await getBotById(id);
  if (!bot || bot.ownerId !== payload.id) {
    return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
  }

  return NextResponse.json({ bot: { ...bot, token: "***" } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await req.json();
    // Prevent token override via this route
    delete body.token;
    delete body.id;
    delete body.ownerId;

    const updated = await updateBot(id, body);
    return NextResponse.json({ success: true, bot: { ...updated, token: "***" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const { id } = await params;
  const bot = await getBotById(id);
  if (!bot || bot.ownerId !== payload.id) {
    return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
  }

  await deleteBot(id);
  return NextResponse.json({ success: true });
}
