import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/db";
import { getPersonalAccounts } from "@/lib/acbot-personal";
import { getLinkedPersonalAccounts } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [linked, live] = await Promise.all([getLinkedPersonalAccounts(payload.id), getPersonalAccounts()]);
    const liveMap = new Map(live.map((account) => [account.id, account]));
    return NextResponse.json({ accounts: linked.map((account) => ({
      ...account,
      online: liveMap.get(account.id)?.online || false,
      avatar: liveMap.get(account.id)?.avatar || account.avatar,
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
