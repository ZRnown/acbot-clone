import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { promises as fsp } from "fs";
import fs from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: string;
  bots: string[];
}

export interface UserTemplate {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  categories: Array<{
    name: string;
    channels: Array<{
      name: string;
      type: number;
      topic?: string;
    }>;
  }>;
  createdAt: string;
}

export interface LinkedPersonalAccount {
  id: string;
  ownerId: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface Bot {
  id: string;
  ownerId: string;
  botId: string;
  name: string;
  status: "online" | "offline";
  guildId: string;
  guildName: string;
  token: string;
  tokenValid: boolean;
  createdAt: string;
  serverCount: number;
  memberCount: number;
  channelCount: number;
  onlineUserCount: number;
  lastSyncedAt: string;
  statsHistory: Array<{
    date: string;
    serverCount: number;
    memberCount: number;
    channelCount: number;
    onlineUserCount: number;
  }>;
  stats: {
    observe: number;
    send: number;
    gift: number;
  };
  config: {
    displayName: string;
    avatar: string;
  };
  migration: {
    sourceGuildId: string;
    targetGuildId: string;
    copyCategories: boolean;
    copyChannels: boolean;
    copyRoles: boolean;
    copyEmojis: boolean;
    copyPermissions: boolean;
    status: "idle" | "running" | "completed" | "failed";
    progress: number;
    log: MigrationLogEntry[];
  };
}

export interface MigrationLogEntry {
  time: string;
  level: string;
  message: string;
}

const DB_PATH = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_PATH, "db.json");

interface Database {
  users: User[];
  bots: Bot[];
  templates: UserTemplate[];
  personalAccounts: LinkedPersonalAccount[];
}

async function readDb(): Promise<Database> {
  try {
    const raw = await fsp.readFile(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    return {
      users: data.users || [],
      bots: data.bots || [],
      templates: data.templates || [],
      personalAccounts: data.personalAccounts || [],
    };
  } catch {
    return { users: [], bots: [], templates: [], personalAccounts: [] };
  }
}

async function writeDb(data: Database) {
  await fsp.mkdir(DB_PATH, { recursive: true });
  await fsp.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const JWT_SECRET = process.env.JWT_SECRET || "acbot-secret-key-change-in-production";

export async function createUser(username: string, password: string): Promise<User> {
  const db = await readDb();
  if (db.users.find((u) => u.username === username)) {
    throw new Error("用户名已存在");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username,
    passwordHash,
    role: db.users.length === 0 ? "admin" : "user",
    createdAt: new Date().toISOString(),
    bots: [],
  };
  db.users.push(user);
  await writeDb(db);
  return user;
}

export async function verifyUser(username: string, password: string): Promise<User | null> {
  const db = await readDb();
  const user = db.users.find((u) => u.username === username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function createToken(user: User): string {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): { id: string; username: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
  } catch {
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function getBotsByOwner(ownerId: string): Promise<Bot[]> {
  const db = await readDb();
  return db.bots.filter((b) => b.ownerId === ownerId);
}

export async function getBotById(id: string): Promise<Bot | null> {
  const db = await readDb();
  return db.bots.find((b) => b.id === id) || null;
}

export async function createBot(ownerId: string, data: Partial<Bot>): Promise<Bot> {
  const db = await readDb();
  const bot: Bot = {
    id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    botId: data.botId || "",
    name: data.name || "新机器人",
    status: "offline",
    guildId: data.guildId || "",
    guildName: data.guildName || "",
    token: data.token || "",
    tokenValid: false,
    createdAt: new Date().toISOString(),
    serverCount: 0,
    memberCount: 0,
    channelCount: 0,
    onlineUserCount: 0,
    lastSyncedAt: "",
    statsHistory: [],
    stats: { observe: 0, send: 0, gift: 0 },
    config: {
      displayName: data.config?.displayName || "",
      avatar: data.config?.avatar || "",
    },
    migration: {
      sourceGuildId: "",
      targetGuildId: "",
      copyCategories: true,
      copyChannels: true,
      copyRoles: true,
      copyEmojis: true,
      copyPermissions: true,
      status: "idle",
      progress: 0,
      log: [],
    },
  };
  db.bots.push(bot);

  const user = db.users.find((u) => u.id === ownerId);
  if (user) user.bots.push(bot.id);

  await writeDb(db);
  return bot;
}

export async function updateBot(id: string, updates: Partial<Bot>): Promise<Bot | null> {
  const db = await readDb();
  const idx = db.bots.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  db.bots[idx] = {
    ...db.bots[idx],
    ...updates,
    config: { ...db.bots[idx].config, ...(updates.config || {}) },
    migration: { ...db.bots[idx].migration, ...(updates.migration || {}) },
    stats: { ...db.bots[idx].stats, ...(updates.stats || {}) },
  };

  await writeDb(db);
  return db.bots[idx];
}

export async function syncBotStats(id: string, stats: {
  serverCount: number;
  memberCount: number;
  channelCount: number;
  onlineUserCount: number;
}): Promise<Bot | null> {
  const db = await readDb();
  const idx = db.bots.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  const now = new Date();
  const dateStr = now.toISOString();

  db.bots[idx].serverCount = stats.serverCount;
  db.bots[idx].memberCount = stats.memberCount;
  db.bots[idx].channelCount = stats.channelCount;
  db.bots[idx].onlineUserCount = stats.onlineUserCount;
  db.bots[idx].lastSyncedAt = dateStr;
  db.bots[idx].tokenValid = true;

  db.bots[idx].statsHistory.unshift({
    date: dateStr,
    serverCount: stats.serverCount,
    memberCount: stats.memberCount,
    channelCount: stats.channelCount,
    onlineUserCount: stats.onlineUserCount,
  });
  if (db.bots[idx].statsHistory.length > 30) {
    db.bots[idx].statsHistory = db.bots[idx].statsHistory.slice(0, 30);
  }

  db.bots[idx].stats = {
    observe: stats.memberCount,
    send: stats.channelCount,
    gift: stats.serverCount,
  };

  await writeDb(db);
  return db.bots[idx];
}

export async function deleteBot(id: string): Promise<boolean> {
  const db = await readDb();
  const idx = db.bots.findIndex((b) => b.id === id);
  if (idx === -1) return false;

  db.bots.splice(idx, 1);

  db.users.forEach((u) => {
    u.bots = u.bots.filter((b) => b !== id);
  });

  await writeDb(db);
  return true;
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return false;

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await writeDb(db);
  return true;
}

// === User Template CRUD ===

export function getUserTemplates(ownerId: string): UserTemplate[] {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    return (data.templates || []).filter((t: UserTemplate) => t.ownerId === ownerId);
  } catch {
    return [];
  }
}

export function saveUserTemplate(ownerId: string, template: Omit<UserTemplate, "ownerId" | "createdAt">): UserTemplate {
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  const data = JSON.parse(raw);
  if (!data.templates) data.templates = [];

  const newTemplate: UserTemplate = {
    ...template,
    ownerId,
    createdAt: new Date().toISOString(),
  };
  data.templates.push(newTemplate);

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  return newTemplate;
}

export function deleteUserTemplate(ownerId: string, templateId: string): boolean {
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  const data = JSON.parse(raw);
  if (!data.templates) return false;

  const before = data.templates.length;
  data.templates = data.templates.filter(
    (t: UserTemplate) => !(t.id === templateId && t.ownerId === ownerId)
  );
  const after = data.templates.length;

  if (before !== after) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  }
  return false;
}

export async function getLinkedPersonalAccounts(ownerId: string) {
  const db = await readDb();
  return db.personalAccounts.filter((account) => account.ownerId === ownerId);
}

export async function linkPersonalAccount(ownerId: string, account: Omit<LinkedPersonalAccount, "ownerId" | "createdAt">) {
  const db = await readDb();
  const existing = db.personalAccounts.find((item) => item.ownerId === ownerId && item.id === account.id);
  if (existing) return existing;
  const linked = { ...account, ownerId, createdAt: new Date().toISOString() };
  db.personalAccounts.push(linked);
  await writeDb(db);
  return linked;
}

export { readDb, writeDb };
export type { Database };
