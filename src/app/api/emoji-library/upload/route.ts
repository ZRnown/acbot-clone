import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBotById } from "@/lib/db";
import { getLibrary } from "@/lib/emoji-library";
import { createEmoji } from "@/lib/kook";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { botId, guildId, emojiIds, namePrefix } = body as {
      botId: string;
      guildId: string;
      emojiIds: string[];
      namePrefix?: string;
    };

    if (!botId || !guildId || !emojiIds || !Array.isArray(emojiIds) || emojiIds.length === 0) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const bot = await getBotById(botId);
    if (!bot || bot.ownerId !== payload.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const library = getLibrary();
    const selectedEmojis = library.filter((e) => emojiIds.includes(e.id));

    if (selectedEmojis.length === 0) {
      return NextResponse.json({ error: "未找到选中的表情" }, { status: 400 });
    }

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];
    let successCount = 0;

    for (const emoji of selectedEmojis) {
      try {
        const filePath = path.join(
          process.cwd(),
          "public",
          "emoji-library",
          emoji.category,
          emoji.filename
        );

        if (!fs.existsSync(filePath)) {
          results.push({ id: emoji.id, name: emoji.name, success: false, error: "文件不存在" });
          continue;
        }

        const buffer = fs.readFileSync(filePath);

        // Apply naming: prefix + original name, or just prefix
        let emojiName = emoji.name;
        if (namePrefix) {
          emojiName = `${namePrefix}${emoji.name}`;
        }

        await createEmoji(bot.token, guildId, emojiName, buffer);
        results.push({ id: emoji.id, name: emojiName, success: true });
        successCount++;

        // Rate limit: KOOK emoji creation is heavy
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e: any) {
        results.push({ id: emoji.id, name: emoji.name, success: false, error: e.message });
        // Brief pause on error too
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      success: true,
      total: selectedEmojis.length,
      successCount,
      failCount: selectedEmojis.length - successCount,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
