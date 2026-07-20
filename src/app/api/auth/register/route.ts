import { NextRequest, NextResponse } from "next/server";
import { createUser, createToken, getUserById } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: "用户名长度需在 2-32 字符之间" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于 6 位" }, { status: 400 });
    }

    const user = await createUser(username, password);
    const token = createToken(user);

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "注册失败" }, { status: 400 });
  }
}
