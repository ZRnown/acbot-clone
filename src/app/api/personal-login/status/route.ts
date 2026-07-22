import { NextRequest, NextResponse } from "next/server";
import { verifyToken, linkPersonalAccount } from "@/lib/db";
import { getPersonalAccounts, getPersonalLoginStatus } from "@/lib/acbot-personal";
import { personalLoginBaselines } from "@/lib/personal-login-state";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = await getPersonalLoginStatus();
    const accounts = await getPersonalAccounts();
    const baseline = personalLoginBaselines.get(payload.id) || new Set<string>();
    const added = accounts.find((account) => !baseline.has(account.id));
    if (added) {
      await linkPersonalAccount(payload.id, { id: added.id, username: added.username, avatar: added.avatar });
      personalLoginBaselines.delete(payload.id);
      return NextResponse.json({ ok: true, complete: true, account: added });
    }
    return NextResponse.json({ ok: true, complete: false, status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
