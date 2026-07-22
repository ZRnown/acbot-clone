import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/db";
import { getPersonalAccounts } from "@/lib/acbot-personal";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ accounts: await getPersonalAccounts() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
