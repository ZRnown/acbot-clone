import { NextRequest, NextResponse } from "next/server";
import {
  addUploadedEmoji,
  createCategory,
  deleteCategory,
  getLibrary,
  scanAndSyncLibrary,
  getCategoryCounts,
  getCategories,
  removeFromLibrary,
} from "@/lib/emoji-library";
import { verifyToken } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function requireUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  return token ? verifyToken(token) : null;
}

function detectImage(buffer: Buffer): { extension: string; label: string } | null {
  const hex = buffer.subarray(0, 12).toString("hex");
  if (hex.startsWith("89504e470d0a1a0a")) return { extension: ".png", label: "PNG" };
  if (hex.startsWith("ffd8ff")) return { extension: ".jpg", label: "JPG" };
  if (buffer.subarray(0, 6).toString("ascii").startsWith("GIF")) return { extension: ".gif", label: "GIF" };
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { extension: ".webp", label: "WebP" };
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Scan for new files and sync library
    const items = scanAndSyncLibrary();
    const counts = getCategoryCounts();

    const category = req.nextUrl.searchParams.get("category");

    let filtered = items;
    if (category && category !== "all") {
      filtered = items.filter((i) => i.category === category);
    }

    return NextResponse.json({
      emojis: filtered,
      categories: getCategories().map((c) => ({
        ...c,
        count: counts[c.key] || 0,
      })),
      total: items.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireUser(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const category = String(form.get("category") || "");
      const files = form.getAll("files").filter((value): value is File => value instanceof File);
      if (!category || files.length === 0) return NextResponse.json({ error: "请选择分类和图片" }, { status: 400 });
      const uploaded = [];
      const failed: Array<{ name: string; error: string }> = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          failed.push({ name: file.name, error: "文件超过 10MB" });
          continue;
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const format = detectImage(buffer);
        if (!format) {
          failed.push({ name: file.name, error: "仅支持 PNG、JPG、GIF、WebP" });
          continue;
        }
        uploaded.push(addUploadedEmoji(category, file.name.replace(/\.[^.]+$/, ""), format.extension, buffer));
      }
      return NextResponse.json({ success: uploaded.length > 0, uploaded, failed });
    }
    const { label } = await req.json() as { label?: string };
    return NextResponse.json({ success: true, category: createCategory(label || "") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireUser(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const { type, key, id } = await req.json() as { type?: "category" | "emoji"; key?: string; id?: string };
    if (type === "category" && key) deleteCategory(key);
    else if (type === "emoji" && id) removeFromLibrary(id);
    else return NextResponse.json({ error: "删除参数无效" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
