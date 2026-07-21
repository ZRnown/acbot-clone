import { NextRequest, NextResponse } from "next/server";
import {
  getLibrary,
  scanAndSyncLibrary,
  getCategoryCounts,
  EMOJI_CATEGORIES,
} from "@/lib/emoji-library";

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
      categories: EMOJI_CATEGORIES.map((c) => ({
        ...c,
        count: counts[c.key] || 0,
      })),
      total: items.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
