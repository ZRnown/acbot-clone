import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLibrary } from "@/lib/emoji-library";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  const { category, id } = await params;

  try {
    const items = getLibrary();
    const item = items.find(
      (i) => i.id === id && i.category === category
    );

    if (!item) {
      return NextResponse.json({ error: "emoji not found" }, { status: 404 });
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "emoji-library",
      category,
      item.filename
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "file not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(item.filename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".gif" ? "image/gif" :
      ext === ".webp" ? "image/webp" : "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
