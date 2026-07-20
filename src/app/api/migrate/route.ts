import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById, updateBot } from "@/lib/db";
import { migrateServer } from "@/lib/kook";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const { botId, sourceGuildId, targetGuildId, copyCategories, copyChannels, copyRoles, copyEmojis, copyPermissions } = await req.json();

    if (!botId || !sourceGuildId || !targetGuildId) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
    }

    // Update bot migration config
    await updateBot(botId, {
      migration: {
        ...bot.migration,
        sourceGuildId,
        targetGuildId,
        copyCategories,
        copyChannels,
        copyRoles,
        copyEmojis,
        copyPermissions,
        status: "running",
        progress: 0,
        log: [],
      },
    });

    // Run migration (this is synchronous for now; in production, use a job queue)
    const result = await migrateServer(bot.token, sourceGuildId, targetGuildId, {
      copyCategories,
      copyChannels,
      copyRoles,
      copyEmojis,
      copyPermissions,
    });

    // Update bot with final status
    await updateBot(botId, {
      migration: {
        ...bot.migration,
        sourceGuildId,
        targetGuildId,
        copyCategories,
        copyChannels,
        copyRoles,
        copyEmojis,
        copyPermissions,
        status: result.success ? "completed" : "failed",
        progress: 100,
        log: result.log,
      },
    });

    return NextResponse.json({
      success: result.success,
      result: {
        categories: result.categories,
        channels: result.channels,
        roles: result.roles,
        emojis: result.emojis,
        errors: result.errors,
      },
      log: result.log,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
