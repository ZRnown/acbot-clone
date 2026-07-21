/**
 * Emoji Library - manages a local collection of emoji images
 * that can be bulk-uploaded to any KOOK server.
 *
 * Emojis are stored in data/emoji-library.json and image files
 * in public/emoji-library/{category}/.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LIBRARY_FILE = path.join(DATA_DIR, "emoji-library.json");
const IMG_DIR = path.join(process.cwd(), "public", "emoji-library");

export interface EmojiItem {
  id: string;
  name: string;
  category: string;
  filename: string;
}

export interface EmojiCategory {
  key: string;
  label: string;
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: "line", label: "分割线" },
  { key: "arrow", label: "箭头" },
  { key: "star", label: "星星" },
  { key: "heart", label: "爱心" },
  { key: "diamond", label: "钻石" },
  { key: "brand", label: "品牌" },
  { key: "wing", label: "翅膀" },
  { key: "other", label: "其他" },
];

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const cat of EMOJI_CATEGORIES) {
    const dir = path.join(IMG_DIR, cat.key);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function getLibrary(): EmojiItem[] {
  ensureDirs();
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
  const filtered = items.filter((i) => i.id !== id);
  saveLibrary(filtered);
  return filtered;
}

export function getCategoryCounts(): Record<string, number> {
  const items = getLibrary();
  const counts: Record<string, number> = {};
  for (const cat of EMOJI_CATEGORIES) {
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

  for (const cat of EMOJI_CATEGORIES) {
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
