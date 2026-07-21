import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/db";
import { buildNavigationCard } from "@/lib/navigation-cards";
import { ServerTemplate } from "@/lib/server-templates";

type PreviewBody = {
  serverName?: string;
  cardTemplateId?: string;
  structure?: ServerTemplate["categories"];
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await req.json()) as PreviewBody;
  const categories = body.structure || [];
  const template: ServerTemplate = {
    id: "preview",
    name: body.serverName?.trim() || "示例服务器",
    description: "导航预览",
    categories,
  };
  let index = 1000000000000000;
  const channels = categories.flatMap((category) => category.channels.map((channel) => ({
    id: String(index++),
    name: channel.name,
    type: Number(channel.type) || 1,
  })));
  const cards = buildNavigationCard(
    template,
    template.name,
    body.cardTemplateId || "skip",
    channels
  );

  return NextResponse.json({
    success: true,
    cards: cards || [],
    content: cards?.[0]?.modules?.[0]?.text?.content || "",
  });
}
