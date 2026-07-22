const ACBOT_BASE = "https://acbot.top";

async function getAcbotToken() {
  const username = process.env.ACBOT_IMPORT_USERNAME;
  const password = process.env.ACBOT_IMPORT_PASSWORD;
  if (!username || !password) throw new Error("ACBot personal account service is not configured");
  const response = await fetch(`${ACBOT_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.token) throw new Error(data.error || "ACBot login failed");
  return data.token as string;
}

export type PersonalAccount = { id: string; username: string; avatar?: string; online: boolean };

export async function getPersonalAccounts(): Promise<PersonalAccount[]> {
  const token = await getAcbotToken();
  const response = await fetch(`${ACBOT_BASE}/api/server-builder/personal-accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load personal accounts");
  return data.accounts || [];
}

export async function startPersonalLogin() {
  const token = await getAcbotToken();
  const response = await fetch(`${ACBOT_BASE}/api/server-builder/personal-login-open`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Failed to start QR login");
  return data as { ok: true; qrDataUrl: string; content: string };
}

export async function getPersonalLoginStatus() {
  const token = await getAcbotToken();
  const response = await fetch(`${ACBOT_BASE}/api/server-builder/personal-login-open/status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return response.json();
}

export async function sendNavigationAsPersonalAccount(
  personalAccountId: string,
  targetChannelId: string,
  cards: unknown[]
) {
  const token = await getAcbotToken();
  const response = await fetch(`${ACBOT_BASE}/api/server-builder/nav/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalAccountId,
      targetChannelId,
      content: JSON.stringify(cards),
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Personal account navigation send failed");
  return data;
}
