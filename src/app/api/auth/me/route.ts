import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserById } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  const user = await getUserById(payload.id);
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 401 });

  return NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role },
  });
}
