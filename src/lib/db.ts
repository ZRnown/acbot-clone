import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { promises as fs } from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: string;
  bots: string[];
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
  createdAt: string;
  stats: {
    observe: number;
    send: number;
    gift: number;
  };
  config: {
    displayName: string;
    avatar: string;
    personality: string;
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
}

async function readDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: [], bots: [] };
  }
}

async function writeDb(data: Database) {
  await fs.mkdir(DB_PATH, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
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
    createdAt: new Date().toISOString(),
    stats: { observe: 0, send: 0, gift: 0 },
    config: {
      displayName: data.config?.displayName || "",
      avatar: data.config?.avatar || "",
      personality: data.config?.personality || "",
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

  // Link bot to user
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

export async function deleteBot(id: string): Promise<boolean> {
  const db = await readDb();
  const idx = db.bots.findIndex((b) => b.id === id);
  if (idx === -1) return false;

  db.bots.splice(idx, 1);

  // Remove from user
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

export { readDb, writeDb };
export type { Database };
