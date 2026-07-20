/**
 * 初始化数据库 - 确保默认管理员账号存在
 * 运行: node scripts/init-db.js
 * 在首次部署或重置密码时使用
 */
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const path = require("path");

const DB_PATH = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_PATH, "db.json");

async function readDb() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: [], bots: [] };
  }
}

async function writeDb(data) {
  await fs.mkdir(DB_PATH, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function ensureUser(username, password, role) {
  const db = await readDb();
  const existing = db.users.find((u) => u.username === username);
  if (existing) {
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.role = role;
    console.log(`[init-db] 用户 ${username} 已存在，密码已重置`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    db.users.push({
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      bots: [],
    });
    console.log(`[init-db] 创建用户 ${username} (${role})`);
  }
  await writeDb(db);
}

async function main() {
  console.log("[init-db] 初始化数据库...");
  await ensureUser("tangtang", "tangtang127", "admin");
  const db = await readDb();
  console.log(`[init-db] 完成。当前用户数: ${db.users.length}, 机器人数: ${db.bots.length}`);
  db.users.forEach((u) => console.log(`  - ${u.username} (${u.role})`));
}

main().catch(console.error);
