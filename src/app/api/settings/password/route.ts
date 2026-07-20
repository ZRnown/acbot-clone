import { NextRequest, NextResponse } from "next/server";
import { verifyToken, updatePassword, getUserById } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "登录已过期" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "请填写完整密码信息" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码长度不能少于 6 位" }, { status: 400 });
    }

    const success = await updatePassword(payload.id, currentPassword, newPassword);
    if (!success) {
      return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
