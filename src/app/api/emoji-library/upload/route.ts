import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getLibrary } from "@/lib/emoji-library";
import { createEmoji } from "@/lib/kook";
import fs from "fs";
import path from "path";

type UploadResult = { id: string; name: string; success: boolean; error?: string };
const uploadJobs = new Map<string, {
  ownerId: string;
  status: "running" | "completed" | "failed";
  total: number;
  current: number;
  successCount: number;
  results: UploadResult[];
  error?: string;
}>();

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { botId, guildId, emojiIds, namePrefix, names } = await req.json() as {
      botId: string; guildId: string; emojiIds: string[]; namePrefix?: string; names?: Record<string, string>;
    };
    if (!botId || !guildId || !Array.isArray(emojiIds) || emojiIds.length === 0) {
      return NextResponse.json({ error: "Missing upload parameters" }, { status: 400 });
    }
    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const selected = getLibrary().filter((emoji) => emojiIds.includes(emoji.id));
    if (!selected.length) return NextResponse.json({ error: "No selected emojis found" }, { status: 400 });

    const jobId = `emoji_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job = { ownerId: payload.id, status: "running" as const, total: selected.length, current: 0, successCount: 0, results: [] as UploadResult[] };
    uploadJobs.set(jobId, job);

    void (async () => {
      try {
        for (const emoji of selected) {
          let emojiName = names?.[emoji.id]?.trim() || emoji.name;
          if (namePrefix) emojiName = `${namePrefix}${emojiName}`;
          emojiName = emojiName.slice(0, 32);
          try {
            const filePath = path.join(process.cwd(), "public", "emoji-library", emoji.category, emoji.filename);
            if (!fs.existsSync(filePath)) throw new Error("File not found");
            await createEmoji(bot.token, guildId, emojiName, fs.readFileSync(filePath));
            job.successCount++;
            job.results.push({ id: emoji.id, name: emojiName, success: true });
          } catch (error) {
            job.results.push({ id: emoji.id, name: emojiName, success: false, error: error instanceof Error ? error.message : String(error) });
          }
          job.current++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        (job as any).status = "completed";
      } catch (error) {
        (job as any).status = "failed";
        (job as any).error = error instanceof Error ? error.message : String(error);
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
