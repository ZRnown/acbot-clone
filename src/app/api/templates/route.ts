import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/db";
import {
  ALL_TEMPLATES,
  DECORATION_STYLES,
  IMPORTED_USER_TEMPLATES,
  getTemplateStats,
  ServerTemplate,
} from "@/lib/server-templates";
import { getUserTemplates, saveUserTemplate, deleteUserTemplate } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  // Return preset templates with stats
  const presets = ALL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    source: t.source,
    categories: t.categories,
    ...getTemplateStats(t),
  }));

  // Return user's saved templates
  const savedUserTemplates = getUserTemplates(payload.id).map((t) => ({
    ...t,
    ...getTemplateStats(t as ServerTemplate),
  }));

  const userTemplates = [
    ...IMPORTED_USER_TEMPLATES.map((t) => ({ ...t, ...getTemplateStats(t) })),
    ...savedUserTemplates,
  ];

  return NextResponse.json({ presets, userTemplates, decorationStyles: DECORATION_STYLES });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, description, categories } = body;

    if (!name || !categories) {
      return NextResponse.json({ error: "缺少模板名称或结构" }, { status: 400 });
    }

    const template = saveUserTemplate(payload.id, {
      id: `user_${Date.now()}`,
      name,
      description: description || "",
      categories,
    });

    return NextResponse.json({ success: true, template });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const templateId = req.nextUrl.searchParams.get("id");
  if (!templateId) return NextResponse.json({ error: "缺少模板ID" }, { status: 400 });

  deleteUserTemplate(payload.id, templateId);
  return NextResponse.json({ success: true });
}
