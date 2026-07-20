/**
 * 初始化数据库 - 确保默认管理员账号存在
 * 运行: npx tsx scripts/init-db.ts 或在首次部署时自动执行
 */
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_PATH, "db.json");

interface Database {
  users: any[];
  bots: any[];
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

async function ensureUser(username: string, password: string, role: "admin" | "user") {
  const db = await readDb();
  let existing = db.users.find((u: any) => u.username === username);
  if (existing) {
    // Update password to ensure it matches
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.role = role;
    console.log(`[init-db] 用户 ${username} 已存在，密码已重置为默认值`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      bots: [],
    };
    db.users.push(user);
    console.log(`[init-db] 创建用户 ${username} (${role})`);
  }
  await writeDb(db);
}

async function main() {
  console.log("[init-db] 初始化数据库...");

  // 确保默认管理员账号存在
  await ensureUser("tangtang", "tangtang127", "admin");

  const db = await readDb();
  console.log(`[init-db] 完成。当前用户数: ${db.users.length}, 机器人数: ${db.bots.length}`);
  db.users.forEach((u: any) => {
    console.log(`  - ${u.username} (${u.role})`);
  });
}

main().catch(console.error);
