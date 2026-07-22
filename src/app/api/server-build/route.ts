import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById, getLinkedPersonalAccounts } from "@/lib/db";
import { ALL_TEMPLATES, decorateCategoryName, ServerTemplate } from "@/lib/server-templates";
import { createChannel, createEmoji, createInvite, deleteChannel, getAllChannelList, sendCardMessage, updateChannel } from "@/lib/kook";
import { buildNavigationCard, splitNavigationCardMessages } from "@/lib/navigation-cards";
import { getLibrary } from "@/lib/emoji-library";
import fs from "fs";
import path from "path";
import { sendNavigationAsPersonalAccount } from "@/lib/acbot-personal";

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
  navigationCardTemplateId?: string;
  sourceGuildId?: string;
  sourceEmojis?: Array<{ name: string; url: string }>;
  clearExisting?: boolean;
  decorationEmojiIds?: string[];
  personalAccountId?: string;
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

  const configuredName = body.serverName?.trim() || template.name;
  const categories = template.categories
    .map((cat) => ({
      name: cat.name?.trim().replaceAll("XX\u7535\u7ade", configuredName),
      channels: (cat.channels || [])
        .map((ch) => ({
          ...ch,
          name: ch.name?.trim().replaceAll("XX\u7535\u7ade", configuredName),
          type: [1, 2, 4].includes(Number(ch.type)) ? Number(ch.type) : 1,
        }))
        .filter((ch) => ch.name),
    }))
    .filter((cat) => cat.name);

  return { ...template, categories };
}

function getBuildDelayMs(duration: string | undefined, totalActions: number) {
  if (!duration || duration === "fast") return 150;

  const minutes = Number(duration);
  if (!Number.isFinite(minutes) || minutes <= 0 || totalActions <= 0) return 500;

  return Math.max(500, Math.floor((minutes * 60_000) / totalActions));
}

function findNavigationTarget(channels: Array<{ id: string; name: string; type: number }>) {
  return channels.find((channel) =>
    (channel.type === 1 || channel.type === 4) && /\u5bfc\u822a|\u4f20\u9001|\u6307\u5f15|\u6307\u8def/.test(channel.name)
  ) || channels.find((channel) => channel.type === 1)
    || channels.find((channel) => channel.type === 4);
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

    if (body.sendWithUser && body.navigationCardTemplateId !== "skip" && !body.personalAccountId) {
      return NextResponse.json({ error: "\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a\u5728\u7ebf\u7684\u4e2a\u4eba\u8d26\u53f7" }, { status: 400 });
    }
    if (body.sendWithUser && body.personalAccountId) {
      const linked = await getLinkedPersonalAccounts(payload.id);
      if (!linked.some((account) => account.id === body.personalAccountId)) {
        return NextResponse.json({ error: "\u4e2a\u4eba\u8d26\u53f7\u672a\u5728\u5f53\u524d\u7cfb\u7edf\u5b8c\u6210\u7ed1\u5b9a" }, { status: 403 });
      }
    }

    const existingChannels = body.clearExisting === false ? [] : await getAllChannelList(bot.token, guildId);
    const totalActions = existingChannels.length + template.categories.reduce(
      (sum, cat) => sum + 1 + cat.channels.length,
      0
    ) + (body.navigationCardTemplateId && body.navigationCardTemplateId !== "skip" ? 1 : 0)
      + (body.sourceEmojis?.length || 0);
    const decorationEmojis = getLibrary().filter((emoji) => body.decorationEmojiIds?.includes(emoji.id));
    const finalTotalActions = totalActions + decorationEmojis.length;
    const delayMs = getBuildDelayMs(body.duration, totalActions);
    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    buildProgress.set(buildId, {
      status: "running",
      step: "准备搭建...",
      current: 0,
      total: finalTotalActions,
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
        let navigationSent = false;
        let emojisCreated = 0;
        const errors: string[] = [];
        const createdChannels: { id: string; name: string; type: number; inviteUrl?: string }[] = [];
        const uploadedEmojiIds = new Map<string, string>();

        if (body.clearExisting !== false && existingChannels.length) {
          addLog("info", `\u6e05\u7406\u76ee\u6807\u670d\u52a1\u5668\uff1a${existingChannels.length} \u4e2a\u9891\u9053/\u5206\u7ec4`);
          const ordered = [...existingChannels].sort((a, b) => Number(a.type === 0) - Number(b.type === 0));
          for (const channel of ordered) {
            try {
              await deleteChannel(bot.token, channel.id);
              addLog("success", `\u5df2\u5220\u9664: ${channel.name}`);
            } catch (error) {
              const message = getErrorMessage(error);
              errors.push(`\u5220\u9664 [${channel.name}] \u5931\u8d25: ${message}`);
              addLog("error", `\u5220\u9664 [${channel.name}] \u5931\u8d25: ${message}`);
            }
            progress.current++;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          const remainingChannels = await getAllChannelList(bot.token, guildId);
          if (remainingChannels.length > 0) {
            throw new Error(`\u76ee\u6807\u670d\u52a1\u5668\u4ecd\u6709 ${remainingChannels.length} \u4e2a\u9891\u9053/\u5206\u7ec4\u672a\u5220\u9664\uff0c\u5df2\u505c\u6b62\u642d\u5efa`);
          }
        }

        for (const [categoryIndex, cat] of template.categories.entries()) {
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
              categoryIndex
            );
            await updateChannel(bot.token, catChannel.id, { level: 100000 - categoryIndex });
            categoriesCreated++;
            progress.current = existingChannels.length + categoriesCreated + channelsCreated;
            progress.step = `创建分组: ${categoryName}`;

            for (const [channelIndex, ch] of cat.channels.entries()) {
              try {
                addLog("info", `创建频道: ${ch.name}`);
                const createdChannel = await createChannel(
                  bot.token,
                  guildId,
                  ch.name,
                  ch.type,
                  catChannel.id,
                  channelIndex
                );
                // KOOK may ignore ordering/parent fields during create; repair both explicitly.
                await updateChannel(bot.token, createdChannel.id, {
                  parent_id: catChannel.id,
                  level: 100000 - channelIndex,
                });
                createdChannels.push({ id: createdChannel.id, name: ch.name, type: ch.type });
                channelsCreated++;
                progress.current = existingChannels.length + categoriesCreated + channelsCreated;
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

        if (body.navigationCardTemplateId && body.navigationCardTemplateId !== "skip") {
          const voiceChannels = createdChannels.filter((channel) => channel.type === 2);
          for (let index = 0; index < voiceChannels.length; index += 5) {
            await Promise.all(voiceChannels.slice(index, index + 5).map(async (channel) => {
              try {
                channel.inviteUrl = await createInvite(bot.token, channel.id);
              } catch {
                // Voice links are optional; navigation falls back to the channel name.
              }
            }));
          }
        }

        if (Boolean(false) && body.navigationCardTemplateId && body.navigationCardTemplateId !== "skip") {
          const target = findNavigationTarget(createdChannels);
          if (!target) {
            errors.push("导航卡片发送失败: 没有可发送消息的文字或帖子频道");
            addLog("error", "导航卡片发送失败: 没有可发送消息的文字或帖子频道");
          } else {
            try {
              progress.step = "发送导航卡片";
              addLog("info", `发送导航卡片到: ${target.name}`);
              const cards = buildNavigationCard(
                template,
                body.serverName?.trim() || template.name,
                body.navigationCardTemplateId,
                createdChannels
              );
              if (cards) {
                const messages = splitNavigationCardMessages(cards);
                for (const messageCards of messages) {
                  if (body.sendWithUser && body.personalAccountId) {
                    await sendNavigationAsPersonalAccount(body.personalAccountId, target.id, messageCards);
                  } else {
                    await sendCardMessage(bot.token, target.id, messageCards);
                  }
                  await new Promise((resolve) => setTimeout(resolve, 500));
                }
                navigationSent = true;
                addLog("success", `导航卡片已发送到: ${target.name}`);
              }
            } catch (e: unknown) {
              const message = getErrorMessage(e);
              errors.push(`导航卡片发送失败: ${message}`);
              addLog("error", `导航卡片发送失败: ${message}`);
            }
          }
          progress.current++;
        }

        for (const emoji of decorationEmojis) {
          try {
            progress.step = `\u4e0a\u4f20\u88c5\u9970\u8868\u60c5: ${emoji.name}`;
            const filePath = path.join(process.cwd(), "public", "emoji-library", emoji.category, emoji.filename);
            if (!fs.existsSync(filePath)) throw new Error("emoji file missing");
            const createdEmoji = await createEmoji(bot.token, guildId, emoji.name, fs.readFileSync(filePath));
            uploadedEmojiIds.set(emoji.name, createdEmoji.id);
            emojisCreated++;
          } catch (error) {
            const message = getErrorMessage(error);
            errors.push(`\u88c5\u9970\u8868\u60c5 [${emoji.name}] \u4e0a\u4f20\u5931\u8d25: ${message}`);
          }
          progress.current++;
          await new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 500)));
        }

        if (body.sourceEmojis?.length) {
          const usedNames = new Map<string, number>();
          for (const emoji of body.sourceEmojis.slice(0, 100)) {
            try {
              progress.step = `\u4e0a\u4f20\u8868\u60c5: ${emoji.name}`;
              const response = await fetch(emoji.url);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const count = (usedNames.get(emoji.name) || 0) + 1;
              usedNames.set(emoji.name, count);
              const name = count === 1 ? emoji.name : `${emoji.name}_${count}`;
              const createdEmoji = await createEmoji(bot.token, guildId, name.slice(0, 32), Buffer.from(await response.arrayBuffer()));
              uploadedEmojiIds.set(emoji.name, createdEmoji.id);
              emojisCreated++;
              addLog("success", `\u8868\u60c5 [${name}] \u4e0a\u4f20\u6210\u529f`);
            } catch (error) {
              const message = getErrorMessage(error);
              errors.push(`\u8868\u60c5 [${emoji.name}] \u4e0a\u4f20\u5931\u8d25: ${message}`);
              addLog("error", `\u8868\u60c5 [${emoji.name}] \u4e0a\u4f20\u5931\u8d25: ${message}`);
            }
            progress.current++;
            await new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 500)));
          }
        }

        if (body.navigationCardTemplateId && body.navigationCardTemplateId !== "skip") {
          const target = findNavigationTarget(createdChannels);
          if (!target) {
            errors.push("\u5bfc\u822a\u5361\u7247\u53d1\u9001\u5931\u8d25\uff1a\u6ca1\u6709\u53ef\u53d1\u9001\u6d88\u606f\u7684\u6587\u5b57\u9891\u9053");
          } else {
            try {
              progress.step = "\u53d1\u9001\u5bfc\u822a\u5361\u7247";
              const cards = buildNavigationCard(
                template,
                body.serverName?.trim() || template.name,
                body.navigationCardTemplateId,
                createdChannels,
                uploadedEmojiIds
              );
              if (cards) {
                const messages = splitNavigationCardMessages(cards);
                for (const messageCards of messages) {
                  if (body.sendWithUser && body.personalAccountId) {
                    await sendNavigationAsPersonalAccount(body.personalAccountId, target.id, messageCards);
                  } else {
                    await sendCardMessage(bot.token, target.id, messageCards);
                  }
                  await new Promise((resolve) => setTimeout(resolve, 500));
                }
                navigationSent = true;
                addLog("success", `\u5bfc\u822a\u5361\u7247\u5df2\u53d1\u9001\u5230: ${target.name}`);
              }
            } catch (error) {
              const message = getErrorMessage(error);
              errors.push(`\u5bfc\u822a\u5361\u7247\u53d1\u9001\u5931\u8d25: ${message}`);
              addLog("error", `\u5bfc\u822a\u5361\u7247\u53d1\u9001\u5931\u8d25: ${message}`);
            }
          }
          progress.current++;
        }

        progress.current = progress.total;
        const completelyFailed = categoriesCreated === 0;
        addLog(
          completelyFailed ? "error" : "success",
          `${completelyFailed ? "搭建失败" : "搭建完成"}: 分组 ${categoriesCreated}, 频道 ${channelsCreated}`
        );
        progress.status = completelyFailed ? "failed" : "completed";
        progress.step = completelyFailed ? "搭建失败" : "搭建完成";
        progress.result = {
          success: errors.length === 0,
          categories: categoriesCreated,
          channels: channelsCreated,
          navigationSent,
          emojis: emojisCreated,
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
