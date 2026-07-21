import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { ALL_TEMPLATES, decorateCategoryName, ServerTemplate } from "@/lib/server-templates";
import { createChannel } from "@/lib/kook";

const buildProgress = new Map<string, {
  status: string;
  step: string;
  current: number;
  total: number;
  log: { time: string; level: string; message: string }[];
  result?: unknown;
}>();

type BuildBody = {
  botId: string;
  guildId: string;
  templateId?: string;
  templateData?: ServerTemplate;
  structure?: ServerTemplate["categories"];
  serverName?: string;
  duration?: string;
  sendWithUser?: boolean;
  decorationStyleId?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeTemplate(body: BuildBody): ServerTemplate | undefined {
  const structure = body.structure?.length ? body.structure : undefined;
  let template: ServerTemplate | undefined;

  if (structure) {
    template = {
      id: "configured-structure",
      name: body.serverName?.trim() || "自定义服务器结构",
      description: "从页面编辑器提交的 KOOK 频道结构",
      categories: structure,
    };
  } else if (body.templateData) {
    template = body.templateData;
  } else if (body.templateId) {
    template = ALL_TEMPLATES.find((t) => t.id === body.templateId);
  }

  if (!template) return undefined;

  const categories = template.categories
    .map((cat) => ({
      name: cat.name?.trim(),
      channels: (cat.channels || [])
        .map((ch) => ({
          ...ch,
          name: ch.name?.trim(),
          type: [1, 2, 4].includes(Number(ch.type)) ? Number(ch.type) : 1,
        }))
        .filter((ch) => ch.name),
    }))
    .filter((cat) => cat.name);

  return { ...template, categories };
}

function getBuildDelayMs(duration: string | undefined, totalActions: number) {
  if (!duration || duration === "fast") return 500;

  const minutes = Number(duration);
  if (!Number.isFinite(minutes) || minutes <= 0 || totalActions <= 0) return 500;

  return Math.max(500, Math.floor((minutes * 60_000) / totalActions));
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = (await req.json()) as BuildBody;
    const { botId, guildId } = body;

    if (!botId || !guildId) {
      return NextResponse.json({ error: "缺少 botId 或 guildId" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const template = normalizeTemplate(body);
    if (!template) {
      return NextResponse.json({ error: "未找到模板或频道结构" }, { status: 400 });
    }

    if (template.categories.length === 0) {
      return NextResponse.json({ error: "请至少配置一个有效分组" }, { status: 400 });
    }

    const totalActions = template.categories.reduce(
      (sum, cat) => sum + 1 + cat.channels.length,
      0
    );
    const delayMs = getBuildDelayMs(body.duration, totalActions);
    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    buildProgress.set(buildId, {
      status: "running",
      step: "准备搭建...",
      current: 0,
      total: totalActions,
      log: [{
        time: new Date().toISOString(),
        level: "info",
        message: `开始搭建 ${template.name}${body.sendWithUser ? "（个人号导航模式已收到，当前按机器人 API 创建频道）" : ""}`,
      }],
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

        for (const cat of template.categories) {
          const categoryName = decorateCategoryName(
            cat.name.replaceAll("{name}", body.serverName?.trim() || template.name),
            body.decorationStyleId
          );
          try {
            addLog("info", `创建分组: ${categoryName}`);
            const catChannel = await createChannel(
              bot.token,
              guildId,
              categoryName,
              0,
              undefined,
              undefined
            );
            categoriesCreated++;
            progress.current = categoriesCreated + channelsCreated;
            progress.step = `创建分组: ${categoryName}`;

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
                progress.current = categoriesCreated + channelsCreated;
                progress.step = `创建频道: ${ch.name}`;
              } catch (e: unknown) {
                const message = getErrorMessage(e);
                errors.push(`频道 [${ch.name}] 创建失败: ${message}`);
                addLog("error", `频道 [${ch.name}] 创建失败: ${message}`);
              }

              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          } catch (e: unknown) {
            const message = getErrorMessage(e);
            errors.push(`分组 [${categoryName}] 创建失败: ${message}`);
            addLog("error", `分组 [${categoryName}] 创建失败: ${message}`);
          }
        }

        addLog("success", `搭建完成: 分组 ${categoriesCreated}, 频道 ${channelsCreated}`);
        progress.status = "completed";
        progress.step = "搭建完成";
        progress.result = {
          success: errors.length === 0,
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
