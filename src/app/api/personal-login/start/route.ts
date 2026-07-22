import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/db";
import { getPersonalAccounts, startPersonalLogin } from "@/lib/acbot-personal";
import { personalLoginBaselines } from "@/lib/personal-login-state";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    personalLoginBaselines.set(payload.id, new Set((await getPersonalAccounts()).map((account) => account.id)));
    return NextResponse.json(await startPersonalLogin());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
