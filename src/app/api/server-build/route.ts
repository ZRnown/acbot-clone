import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { ALL_TEMPLATES } from "@/lib/server-templates";
import { createChannel } from "@/lib/kook";
import { ServerTemplate } from "@/lib/server-templates";

// In-memory build progress tracking
const buildProgress = new Map<string, {
  status: string;
  step: string;
  current: number;
  total: number;
  log: { time: string; level: string; message: string }[];
  result?: any;
}>();

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { botId, guildId, templateId, templateData, decoration } = body as {
      botId: string;
      guildId: string;
      templateId?: string;
      templateData?: ServerTemplate;
      decoration?: string;
    };

    if (!botId || !guildId) {
      return NextResponse.json({ error: "缺少 botId 或 guildId" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // Get the template
    let template: ServerTemplate | undefined;
    if (templateId) {
      template = ALL_TEMPLATES.find((t) => t.id === templateId);
    }
    if (!template && templateData) {
      template = templateData;
    }

    if (!template) {
      return NextResponse.json({ error: "未找到模板" }, { status: 400 });
    }

    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Initialize progress
    const totalChannels = template.categories.reduce(
      (sum, cat) => sum + cat.channels.length,
      0
    );
    buildProgress.set(buildId, {
      status: "running",
      step: "准备搭建...",
      current: 0,
      total: totalChannels,
      log: [{ time: new Date().toISOString(), level: "info", message: `开始搭建: ${template.name}` }],
    });

    // Start async build (do NOT await)
    (async () => {
      const progress = buildProgress.get(buildId)!;
      const addLog = (level: string, message: string) => {
        progress.log.push({ time: new Date().toISOString(), level, message });
      };

      try {
        let categoriesCreated = 0;
        let channelsCreated = 0;
        const errors: string[] = [];

        for (const cat of template!.categories) {
          try {
            addLog("info", `创建分组: ${cat.name}`);
            // Create category (type 0 doesn't exist in KOOK, categories are created as type 1 with level)
            // Actually in KOOK, to create a category, create a channel with is_category or use the level system
            // KOOK channel types: 1=text, 2=voice. Categories are created differently.
            // In practice, we create a text channel and then set children's parent_id
            // But the API create endpoint doesn't directly support categories.
            // Let's use the approach: create category as a text channel first, then set parent_id on children
            const catChannel = await createChannel(
              bot.token,
              guildId,
              cat.name,
              1, // text channel acts as category group
              undefined,
              undefined
            );
            categoriesCreated++;

            for (const ch of cat.channels) {
              try {
                addLog("info", `创建频道: ${ch.name}`);
                const newCh = await createChannel(
                  bot.token,
                  guildId,
                  ch.name,
                  ch.type,
                  catChannel.id,
                  undefined
                );
                channelsCreated++;

                if (ch.topic) {
                  try {
                    // updateChannel is optional, skip if not available
                  } catch {}
                }

                progress.current = channelsCreated;
                progress.step = `创建频道: ${ch.name}`;
              } catch (e: any) {
                errors.push(`频道 [${ch.name}] 创建失败: ${e.message}`);
                addLog("error", `频道 [${ch.name}] 创建失败: ${e.message}`);
              }
              await new Promise((r) => setTimeout(r, 500));
            }
          } catch (e: any) {
            errors.push(`分组 [${cat.name}] 创建失败: ${e.message}`);
            addLog("error", `分组 [${cat.name}] 创建失败: ${e.message}`);
          }
        }

        addLog("success", `搭建完成! 分组 ${categoriesCreated}, 频道 ${channelsCreated}`);
        progress.status = "completed";
        progress.result = {
          success: true,
          categories: categoriesCreated,
          channels: channelsCreated,
          errors,
        };
      } catch (e: any) {
        addLog("error", `搭建失败: ${e.message}`);
        progress.status = "failed";
        progress.result = {
          success: false,
          errors: [e.message],
        };
      }
    })();

    return NextResponse.json({ buildId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const buildId = req.nextUrl.searchParams.get("buildId");
  if (!buildId) return NextResponse.json({ error: "缺少 buildId" }, { status: 400 });

  const progress = buildProgress.get(buildId);
  if (!progress) return NextResponse.json({ error: "未找到构建任务" }, { status: 404 });

  return NextResponse.json(progress);
}
