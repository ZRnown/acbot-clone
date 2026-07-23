import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getLibrary } from "@/lib/emoji-library";
import { createEmoji, deleteEmoji, getAllEmojis } from "@/lib/kook";
import fs from "fs";
import path from "path";

type UploadResult = { id: string; name: string; success: boolean; error?: string };
type UploadLog = { level: "info" | "success" | "error"; message: string };
const uploadJobs = new Map<string, {
  ownerId: string;
  status: "running" | "completed" | "failed";
  total: number;
  current: number;
  successCount: number;
  results: UploadResult[];
  logs: UploadLog[];
  error?: string;
}>();

function translateEmojiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SYS_COMMON_STATIC number of slots are available")) return "目标服务器的静态表情槽位已满";
  if (message.includes("SYS_COMMON_DYNAMIC number of slots are available")) return "目标服务器的动态表情槽位已满";
  if (message.includes("图片包含敏感内容")) return "图片未通过 KOOK 内容审核，包含敏感内容";
  if (message.includes("File not found")) return "本地表情文件不存在";
  if (/permission|权限|无权|403/i.test(message)) return "机器人没有管理该服务器表情的权限";
  return message;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { botId, guildId, emojiIds, nameOverride, names, clearExisting } = await req.json() as {
      botId: string; guildId: string; emojiIds: string[]; nameOverride?: string; names?: Record<string, string>; clearExisting?: boolean;
    };
    if (!botId || !guildId || !Array.isArray(emojiIds) || emojiIds.length === 0) {
      return NextResponse.json({ error: "Missing upload parameters" }, { status: 400 });
    }
    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const selectionOrder = new Map(emojiIds.map((id, index) => [id, index]));
    const selected = getLibrary()
      .filter((emoji) => selectionOrder.has(emoji.id))
      .sort((left, right) => (selectionOrder.get(left.id) || 0) - (selectionOrder.get(right.id) || 0));
    if (!selected.length) return NextResponse.json({ error: "No selected emojis found" }, { status: 400 });

    const jobId = `emoji_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job = {
      ownerId: payload.id,
      status: "running" as "running" | "completed" | "failed",
      total: selected.length,
      current: 0,
      successCount: 0,
      results: [] as UploadResult[],
      logs: [] as UploadLog[],
      error: undefined as string | undefined,
    };
    uploadJobs.set(jobId, job);

    void (async () => {
      try {
        if (clearExisting) {
          const existing = await getAllEmojis(bot.token, guildId);
          job.logs.push({ level: "info", message: `开始删除目标服务器现有的 ${existing.length} 个表情` });
          for (const emoji of existing) {
            try {
              await deleteEmoji(bot.token, emoji.id);
              job.logs.push({ level: "success", message: `已删除表情：${emoji.name}` });
            } catch (error) {
              const reason = translateEmojiError(error);
              job.logs.push({ level: "error", message: `删除表情失败：${emoji.name} - ${reason}` });
            }
          }
          const remaining = await getAllEmojis(bot.token, guildId);
          if (remaining.length > 0) {
            throw new Error(`清空失败，目标服务器仍有 ${remaining.length} 个表情，已停止上传`);
          }
          job.logs.push({ level: "success", message: "目标服务器原有表情已全部删除" });
        }
        job.logs.push({ level: "info", message: `开始上传 ${selected.length} 个表情` });
        for (const [index, emoji] of selected.entries()) {
          const sequence = String(index + 1);
          let emojiName = names?.[emoji.id]?.trim() || emoji.name;
          if (nameOverride?.trim()) {
            emojiName = `${nameOverride.trim().slice(0, 32 - sequence.length)}${sequence}`;
          } else {
            emojiName = emojiName.slice(0, 32);
          }
          try {
            const filePath = path.join(process.cwd(), "public", "emoji-library", emoji.category, emoji.filename);
            if (!fs.existsSync(filePath)) throw new Error("File not found");
            await createEmoji(bot.token, guildId, emojiName, fs.readFileSync(filePath));
            job.successCount++;
            job.results.push({ id: emoji.id, name: emojiName, success: true });
          } catch (error) {
            job.results.push({ id: emoji.id, name: emojiName, success: false, error: translateEmojiError(error) });
          }
          job.current++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        job.status = "completed";
      } catch (error) {
        job.status = "failed";
        job.error = translateEmojiError(error);
        job.logs.push({ level: "error", message: job.error });
      }
    })();
    return NextResponse.json({ jobId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const job = uploadJobs.get(req.nextUrl.searchParams.get("jobId") || "");
  if (!job || job.ownerId !== payload.id) return NextResponse.json({ error: "Upload job not found" }, { status: 404 });
  return NextResponse.json({
    ...job,
    success: job.status === "completed" && job.successCount > 0,
    failCount: job.current - job.successCount,
  });
}
