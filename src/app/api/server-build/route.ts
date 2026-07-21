import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { ALL_TEMPLATES } from "@/lib/server-templates";
import { createChannel } from "@/lib/kook";
import { ServerTemplate } from "@/lib/server-templates";

const buildProgress = new Map<string, {
  status: string;
  step: string;
  current: number;
  total: number;
  log: { time: string; level: string; message: string }[];
  result?: unknown;
}>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { botId, guildId, templateId, templateData, structure } = body as {
      botId: string;
      guildId: string;
      templateId?: string;
      templateData?: ServerTemplate;
      structure?: ServerTemplate["categories"];
    };

    if (!botId || !guildId) {
      return NextResponse.json({ error: "缺少 botId 或 guildId" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    let template: ServerTemplate | undefined;
    if (templateId) template = ALL_TEMPLATES.find((t) => t.id === templateId);
    if (!template && templateData) template = templateData;
    if (!template && structure) {
      template = {
        id: "imported-structure",
        name: "导入的服务器结构",
        description: "从 KOOK 服务器导入的频道结构",
        categories: structure,
      };
    }

    if (!template) {
      return NextResponse.json({ error: "未找到模板或导入结构" }, { status: 400 });
    }

    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalChannels = template.categories.reduce(
      (sum, cat) => sum + cat.channels.length,
      0
    );

    buildProgress.set(buildId, {
      status: "running",
      step: "准备搭建...",
      current: 0,
      total: totalChannels,
      log: [{ time: new Date().toISOString(), level: "info", message: `开始搭建 ${template.name}` }],
    });

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
            const catChannel = await createChannel(
              bot.token,
              guildId,
              cat.name,
              1,
              undefined,
              undefined
            );
            categoriesCreated++;

            for (const ch of cat.channels) {
              try {
                addLog("info", `创建频道: ${ch.name}`);
                await createChannel(
                  bot.token,
                  guildId,
                  ch.name,
                  ch.type,
                  catChannel.id,
                  undefined
                );
                channelsCreated++;
                progress.current = channelsCreated;
                progress.step = `创建频道: ${ch.name}`;
              } catch (e: unknown) {
                const message = getErrorMessage(e);
                errors.push(`频道 [${ch.name}] 创建失败: ${message}`);
                addLog("error", `频道 [${ch.name}] 创建失败: ${message}`);
              }
              await new Promise((r) => setTimeout(r, 500));
            }
          } catch (e: unknown) {
            const message = getErrorMessage(e);
            errors.push(`分组 [${cat.name}] 创建失败: ${message}`);
            addLog("error", `分组 [${cat.name}] 创建失败: ${message}`);
          }
        }

        addLog("success", `搭建完成: 分组 ${categoriesCreated}, 频道 ${channelsCreated}`);
        progress.status = "completed";
        progress.step = "搭建完成";
        progress.result = {
          success: true,
          categories: categoriesCreated,
          channels: channelsCreated,
          errors,
        };
      } catch (e: unknown) {
        const message = getErrorMessage(e);
        addLog("error", `搭建失败: ${message}`);
        progress.status = "failed";
        progress.step = "搭建失败";
        progress.result = {
          success: false,
          errors: [message],
        };
      }
    })();

    return NextResponse.json({ buildId, jobId: buildId });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const buildId = req.nextUrl.searchParams.get("buildId") || req.nextUrl.searchParams.get("jobId");
  if (!buildId) return NextResponse.json({ error: "缺少 buildId" }, { status: 400 });

  const progress = buildProgress.get(buildId);
  if (!progress) return NextResponse.json({ error: "未找到搭建任务" }, { status: 404 });

  return NextResponse.json({
    ...progress,
    progress: progress.total > 0 ? progress.current / progress.total : 0,
    currentStep: progress.step,
  });
}
