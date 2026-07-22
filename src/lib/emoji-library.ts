/**
 * Emoji Library - manages a local collection of emoji images
 * that can be bulk-uploaded to any KOOK server.
 *
 * Emojis are stored in data/emoji-library.json and image files
 * in public/emoji-library/{category}/.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const LIBRARY_FILE = path.join(DATA_DIR, "emoji-library.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "emoji-categories.json");
const IMG_DIR = path.join(process.cwd(), "public", "emoji-library");

export interface EmojiItem {
  id: string;
  name: string;
  category: string;
  filename: string;
  group?: string;
}

export interface EmojiCategory {
  key: string;
  label: string;
}

const DEFAULT_EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: "imported", label: "\u5bfc\u5165\u8868\u60c5" },
];

export function getCategories(): EmojiCategory[] {
  ensureBaseDirs();
  let categories = DEFAULT_EMOJI_CATEGORIES;
  if (fs.existsSync(CATEGORIES_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf-8"));
      if (Array.isArray(parsed)) categories = parsed;
    } catch { /* Fall back to the built-in imported category. */ }
  }
  const items = readLibraryFile();
  const known = new Set(categories.map((category) => category.key));
  for (const item of items) {
    if (!known.has(item.category)) {
      categories = [...categories, { key: item.category, label: item.category }];
      known.add(item.category);
    }
  }
  return categories;
}

export function createCategory(label: string): EmojiCategory {
  const cleanLabel = label.trim().slice(0, 30);
  if (!cleanLabel) throw new Error("分类名称不能为空");
  const categories = getCategories();
  if (categories.some((category) => category.label === cleanLabel)) throw new Error("已存在同名分类");
  const category = { key: `custom_${crypto.randomBytes(6).toString("hex")}`, label: cleanLabel };
  categories.push(category);
  saveCategories(categories);
  fs.mkdirSync(path.join(IMG_DIR, category.key), { recursive: true });
  return category;
}

export function deleteCategory(key: string) {
  if (key === "imported") throw new Error("导入表情是系统分类，不能删除");
  const categories = getCategories();
  if (!categories.some((category) => category.key === key)) throw new Error("分类不存在");
  const items = getLibrary();
  for (const item of items.filter((emoji) => emoji.category === key)) deleteEmojiFile(item);
  saveLibrary(items.filter((emoji) => emoji.category !== key));
  saveCategories(categories.filter((category) => category.key !== key));
  const directory = path.join(IMG_DIR, key);
  if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
}

function saveCategories(categories: EmojiCategory[]) {
  ensureBaseDirs();
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), "utf-8");
}

export async function importRemoteEmojis(
  guildId: string,
  emojis: Array<{ name: string; url: string }>,
  groupName?: string
) {
  ensureDirs();
  const items = getLibrary();
  const itemIds = new Set(items.map((item) => item.id));
  let imported = 0;
  let metadataUpdated = false;
  for (const emoji of emojis) {
    try {
      const url = new URL(emoji.url);
      if (url.protocol !== "https:" || url.hostname !== "img.kookapp.cn") continue;
      const hash = crypto.createHash("sha1").update(emoji.url).digest("hex").slice(0, 16);
      const id = `imported_${guildId}_${hash}`;
      if (itemIds.has(id)) {
        const existing = items.find((item) => item.id === id);
        if (existing && !existing.group && groupName) {
          existing.group = groupName;
          metadataUpdated = true;
        }
        continue;
      }
      const response = await fetch(url);
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "image/png";
      const extension = contentType.includes("gif") ? ".gif"
        : contentType.includes("webp") ? ".webp"
          : contentType.includes("jpeg") ? ".jpg" : ".png";
      const filename = `${guildId}_${hash}${extension}`;
      fs.writeFileSync(path.join(IMG_DIR, "imported", filename), Buffer.from(await response.arrayBuffer()));
      items.push({ id, name: emoji.name || hash, category: "imported", filename, group: groupName || guildId });
      itemIds.add(id);
      imported++;
    } catch {
      // Keep importing the remaining emojis when one source image is unavailable.
    }
  }
  if (imported || metadataUpdated) saveLibrary(items);
  return imported;
}

function ensureBaseDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
}

function ensureDirs() {
  ensureBaseDirs();
  for (const cat of getCategories()) {
    const dir = path.join(IMG_DIR, cat.key);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function getLibrary(): EmojiItem[] {
  ensureDirs();
  return readLibraryFile();
}

function readLibraryFile(): EmojiItem[] {
  if (!fs.existsSync(LIBRARY_FILE)) return [];
  try {
    const data = fs.readFileSync(LIBRARY_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveLibrary(items: EmojiItem[]) {
  ensureDirs();
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export function addToLibrary(item: EmojiItem) {
  const items = getLibrary();
  if (!items.find((i) => i.id === item.id)) {
    items.push(item);
    saveLibrary(items);
  }
  return items;
}

export function removeFromLibrary(id: string) {
  const items = getLibrary();
  const item = items.find((emoji) => emoji.id === id);
  if (item) deleteEmojiFile(item);
  const filtered = items.filter((i) => i.id !== id);
  saveLibrary(filtered);
  return filtered;
}

export function removeGroupFromLibrary(group: string) {
  const items = getLibrary();
  const matched = items.filter((item) => item.group === group);
  for (const item of matched) deleteEmojiFile(item);
  saveLibrary(items.filter((item) => item.group !== group));
  return matched.length;
}

function deleteEmojiFile(item: EmojiItem) {
  const filePath = path.join(IMG_DIR, item.category, item.filename);
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

export function addUploadedEmoji(category: string, name: string, extension: string, buffer: Buffer, group?: string): EmojiItem {
  const categoryInfo = getCategories().find((item) => item.key === category);
  if (!categoryInfo) throw new Error("上传分类不存在");
  const id = `local_${crypto.randomBytes(10).toString("hex")}`;
  const filename = `${id}${extension}`;
  fs.mkdirSync(path.join(IMG_DIR, category), { recursive: true });
  fs.writeFileSync(path.join(IMG_DIR, category, filename), buffer);
  const item = { id, name: name.trim().slice(0, 32) || id, category, filename, group: group?.trim() || categoryInfo.label };
  addToLibrary(item);
  return item;
}

export function getCategoryCounts(): Record<string, number> {
  const items = getLibrary();
  const counts: Record<string, number> = {};
  for (const cat of getCategories()) {
    counts[cat.key] = 0;
  }
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }
  return counts;
}

export function scanAndSyncLibrary() {
  ensureDirs();
  const existing = getLibrary();
  const existingIds = new Set(existing.map((i) => i.id));
  let changed = false;

  for (const cat of getCategories()) {
    const dir = path.join(IMG_DIR, cat.key);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) =>
      /\.(png|jpg|jpeg|gif|webp)$/i.test(f)
    );
    for (const file of files) {
      const id = `${cat.key}_${path.parse(file).name}`;
      if (!existingIds.has(id)) {
        existing.push({
          id,
          name: path.parse(file).name,
          category: cat.key,
          filename: file,
        });
        changed = true;
      }
    }
  }

  if (changed) {
    saveLibrary(existing);
  }
  return existing;
}
