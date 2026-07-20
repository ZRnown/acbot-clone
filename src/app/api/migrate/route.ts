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

    // Check if a migration is already running
    if (bot.migration?.status === "running") {
      return NextResponse.json({ error: "已有迁移任务正在运行，请等待完成" }, { status: 409 });
    }

    // Set initial status
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
        log: [{ time: new Date().toISOString(), level: "info", message: "迁移任务已启动..." }],
      },
    });

    // Run migration in the background (do NOT await)
    migrateServer(bot.token, sourceGuildId, targetGuildId, {
      copyCategories,
      copyChannels,
      copyRoles,
      copyEmojis,
      copyPermissions,
    }, async (progress) => {
      // Write progress to DB on each callback
      try {
        const current = await getBotById(botId);
        if (current) {
          await updateBot(botId, {
            migration: {
              ...current.migration,
              sourceGuildId,
              targetGuildId,
              copyCategories,
              copyChannels,
              copyRoles,
              copyEmojis,
              copyPermissions,
              status: "running",
              progress: progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0,
              log: progress.log,
            },
          });
        }
      } catch {
        // Ignore write errors during progress updates
      }
    }).then(async (result) => {
      // Migration completed
      try {
        const current = await getBotById(botId);
        if (current) {
          await updateBot(botId, {
            migration: {
              ...current.migration,
              status: result.success ? "completed" : "failed",
              progress: 100,
              log: result.log,
            },
          });
        }
      } catch {
        // Ignore
      }
    }).catch(async (err) => {
      // Migration failed
      try {
        const current = await getBotById(botId);
        if (current) {
          await updateBot(botId, {
            migration: {
              ...current.migration,
              status: "failed",
              progress: 0,
              log: [
                ...current.migration.log,
                { time: new Date().toISOString(), level: "error", message: err.message || "迁移失败" },
              ],
            },
          });
        }
      } catch {
        // Ignore
      }
    });

    // Return immediately — frontend polls /api/migrate/status
    return NextResponse.json({ success: true, message: "迁移任务已启动" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

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

  return NextResponse.json({
    status: bot.migration?.status || "idle",
    progress: bot.migration?.progress || 0,
    log: bot.migration?.log || [],
  });
}
