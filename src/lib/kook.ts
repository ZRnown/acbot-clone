/**
 * KOOK HTTP API v3 Client
 * Supports guild migration: categories, channels, roles, permissions, emojis
 * Docs: https://developer.kookapp.cn/doc/http
 */

const KOOK_API_BASE = "https://www.kookapp.cn/api/v3";

export interface KookChannel {
  id: string;
  name: string;
  type: number; // 1=文字, 2=语音
  parent_id?: string;
  level?: number;
  sort_id?: number;
  topic?: string;
  server_url?: string;
  slow_mode?: number;
  permission_overwrites?: PermissionOverwrite[];
}

export interface PermissionOverwrite {
  role_id: number;
  allow: number;
  deny: number;
}

export interface KookRole {
  role_id: number;
  name: string;
  color: number;
  position: number;
  hoist: number;
  mentionable: number;
  permissions: number;
}

export interface KookEmoji {
  name: string;
  id: string;
  user_info?: {
    id: string;
    username: string;
  };
}

export interface KookGuild {
  id: string;
  name: string;
  topic: string;
  master_id: string;
  icon: string;
  notify_type: number;
  region: string;
  enable_open: number;
  open_id: string;
  default_channel_id: string;
  welcome_channel_id: string;
  user_count?: number;
  online_count?: number;
}

async function kookRequest(token: string, endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${KOOK_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bot ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(`KOOK API Error [${endpoint}]: code=${data.code}, message=${data.message}`);
  }

  return data.data;
}

// === Guild ===
export async function getGuild(token: string, guildId: string): Promise<KookGuild> {
  return kookRequest(token, `/guild/view?guild_id=${guildId}`);
}

export async function getGuildList(token: string): Promise<KookGuild[]> {
  const data = await kookRequest(token, `/guild/list`);
  return data.items || [];
}

// === Channels & Categories ===
export async function getChannelList(token: string, guildId: string): Promise<KookChannel[]> {
  const data = await kookRequest(token, `/channel/list?guild_id=${guildId}&page=1&page_size=50`);
  return data.items || [];
}

export async function getAllChannelList(token: string, guildId: string): Promise<KookChannel[]> {
  const all: KookChannel[] = [];
  let page = 1;
  let total = Infinity;
  while (all.length < total) {
    const data = await kookRequest(token, `/channel/list?guild_id=${guildId}&page=${page}&page_size=50`);
    const items = data.items || [];
    all.push(...items);
    total = data.meta?.total ?? all.length;
    if (items.length === 0 || items.length < 50) break;
    page++;
  }
  return all;
}

export async function createChannel(
  token: string,
  guildId: string,
  name: string,
  type: number,
  parentId?: string,
  level?: number
): Promise<KookChannel> {
  const body: Record<string, any> = type === 0
    ? { guild_id: guildId, name, is_category: 1 }
    : { guild_id: guildId, name, type };
  if (parentId) body.parent_id = parentId;
  if (level !== undefined) body.level = level;

  return kookRequest(token, `/channel/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateChannel(
  token: string,
  channelId: string,
  updates: Partial<Pick<KookChannel, "name" | "topic" | "level" | "slow_mode" | "parent_id">>
): Promise<void> {
  await kookRequest(token, `/channel/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, ...updates }),
  });
}

export async function deleteChannel(token: string, channelId: string): Promise<void> {
  await kookRequest(token, `/channel/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId }),
  });
}

export async function sendCardMessage(
  token: string,
  channelId: string,
  cards: unknown[]
): Promise<{ msg_id: string; msg_timestamp: number; nonce: string }> {
  return kookRequest(token, `/message/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: 10,
      target_id: channelId,
      content: JSON.stringify(cards),
    }),
  });
}

// === Channel Role Permissions ===
export async function createChannelRole(
  token: string,
  channelId: string,
  roleId: number,
  allow: number = 0,
  deny: number = 0
): Promise<void> {
  await kookRequest(token, `/channel-role/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, role_id: roleId, allow, deny }),
  });
}

export async function updateChannelRole(
  token: string,
  channelId: string,
  roleId: number,
  allow: number = 0,
  deny: number = 0
): Promise<void> {
  await kookRequest(token, `/channel-role/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, role_id: roleId, allow, deny }),
  });
}

export async function syncChannelRole(token: string, channelId: string): Promise<void> {
  await kookRequest(token, `/channel-role/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId }),
  });
}

export async function getChannelRoles(token: string, channelId: string): Promise<any> {
  return kookRequest(token, `/channel-role/index?channel_id=${channelId}`);
}

// === Roles ===
export async function getRoleList(token: string, guildId: string): Promise<KookRole[]> {
  const data = await kookRequest(token, `/guild-role/list?guild_id=${guildId}&page=1&page_size=100`);
  return data.items || [];
}

export async function createRole(
  token: string,
  guildId: string,
  name: string,
  color: number = 0,
  permissions: number = 0,
  hoist: number = 0,
  mentionable: number = 0
): Promise<{ role_id: number }> {
  return kookRequest(token, `/guild-role/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guild_id: guildId, name, color, permissions, hoist, mentionable }),
  });
}

export async function updateRole(
  token: string,
  guildId: string,
  roleId: number,
  updates: Partial<Pick<KookRole, "name" | "color" | "permissions" | "position" | "hoist" | "mentionable">>
): Promise<void> {
  await kookRequest(token, `/guild-role/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guild_id: guildId, role_id: roleId, ...updates }),
  });
}

export async function deleteRole(token: string, guildId: string, roleId: number): Promise<void> {
  await kookRequest(token, `/guild-role/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guild_id: guildId, role_id: roleId }),
  });
}

// === Emojis ===
export async function getEmojiList(token: string, guildId: string, page: number = 1, pageSize: number = 50): Promise<{ items: KookEmoji[]; total: number }> {
  const data = await kookRequest(token, `/guild-emoji/list?guild_id=${guildId}&page=${page}&page_size=${pageSize}`);
  return {
    items: data.items || [],
    total: data.meta?.total || 0,
  };
}

export async function getAllEmojis(token: string, guildId: string): Promise<KookEmoji[]> {
  const all: KookEmoji[] = [];
  let page = 1;
  const pageSize = 50;
  let total = Infinity;

  while (all.length < total) {
    const result = await getEmojiList(token, guildId, page, pageSize);
    all.push(...result.items);
    total = result.total;
    page++;
    if (result.items.length < pageSize) break;
  }

  return all;
}

/**
 * Download emoji image and re-upload to target guild.
 * KOOK emoji URLs are constructed from the emoji id format: https://www.kookapp.cn/emojis/<id>
 */
export async function downloadEmojiImage(emojiId: string): Promise<Buffer> {
  const url = `https://www.kookapp.cn/emojis/${emojiId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download emoji ${emojiId}: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function createEmoji(
  token: string,
  guildId: string,
  name: string,
  emojiBuffer: Buffer
): Promise<KookEmoji> {
  const formData = new FormData();
  formData.append("guild_id", guildId);
  formData.append("name", name);

  const blob = new Blob([new Uint8Array(emojiBuffer)], { type: "image/png" });
  formData.append("emoji", blob);

  return kookRequest(token, `/guild-emoji/create`, {
    method: "POST",
    body: formData,
  });
}

// === Migration Orchestrator ===
export interface MigrationOptions {
  copyCategories: boolean;
  copyChannels: boolean;
  copyRoles: boolean;
  copyEmojis: boolean;
  copyPermissions: boolean;
}

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  log: { time: string; level: string; message: string }[];
}

export interface MigrationResult {
  success: boolean;
  categories: number;
  channels: number;
  roles: number;
  emojis: number;
  errors: string[];
  log: { time: string; level: string; message: string }[];
}

/**
 * Full server migration: copies categories → channels → roles → permissions → emojis
 * from source guild to target guild using the bot's token.
 *
 * Order matters:
 * 1. Create roles (needed for permission overwrites)
 * 2. Create categories (parent containers)
 * 3. Create channels under categories
 * 4. Apply channel role permission overwrites
 * 5. Copy emojis
 */
export async function migrateServer(
  token: string,
  sourceGuildId: string,
  targetGuildId: string,
  options: MigrationOptions,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const log: { time: string; level: string; message: string }[] = [];
  const errors: string[] = [];
  let categoriesCreated = 0;
  let channelsCreated = 0;
  let rolesCreated = 0;
  let emojisCreated = 0;

  const addLog = (level: string, message: string) => {
    const entry = { time: new Date().toISOString(), level, message };
    log.push(entry);
    onProgress?.({
      step: message,
      current: 0,
      total: 0,
      log: [...log],
    });
  };

  try {
    addLog("info", `开始迁移: 源服务器 ${sourceGuildId} → 目标服务器 ${targetGuildId}`);

    // Fetch source data
    addLog("info", "正在获取源服务器数据...");
    const [sourceChannels, sourceRoles, sourceEmojis] = await Promise.all([
      getChannelList(token, sourceGuildId),
      options.copyRoles ? getRoleList(token, sourceGuildId) : Promise.resolve([]),
      options.copyEmojis ? getAllEmojis(token, sourceGuildId) : Promise.resolve([]),
    ]);

    addLog("info", `源数据: ${sourceChannels.length} 个频道, ${sourceRoles.length} 个角色, ${sourceEmojis.length} 个表情`);

    // Separate categories and channels
    const sourceCategories = sourceChannels.filter((c) => c.type === 0 && !c.parent_id); // categories have no parent
    const sourceTextChannels = sourceChannels.filter((c) => c.type !== 0 || c.parent_id);

    // Map for tracking old→new IDs
    const roleIdMap = new Map<number, number>(); // old role_id → new role_id
    const categoryIdMap = new Map<string, string>(); // old channel id → new channel id
    const channelIdMap = new Map<string, string>(); // old channel id → new channel id

    // Step 1: Create roles (skip @everyone role which is role_id 0, and Bot role)
    if (options.copyRoles) {
      addLog("info", `开始复制角色 (${sourceRoles.length} 个)...`);
      const rolesToCopy = sourceRoles.filter((r) => r.role_id !== 0); // skip @everyone
      let roleIdx = 0;
      for (const role of rolesToCopy) {
        try {
          const newRole = await createRole(
            token,
            targetGuildId,
            role.name,
            role.color,
            role.permissions,
            role.hoist,
            role.mentionable
          );
          roleIdMap.set(role.role_id, newRole.role_id);
          rolesCreated++;
          addLog("info", `角色 [${role.name}] 创建成功 (ID: ${newRole.role_id})`);
        } catch (e: any) {
          errors.push(`角色 [${role.name}] 创建失败: ${e.message}`);
          addLog("error", `角色 [${role.name}] 创建失败: ${e.message}`);
        }
        roleIdx++;
        onProgress?.({
          step: `复制角色: ${role.name}`,
          current: roleIdx,
          total: rolesToCopy.length,
          log: [...log],
        });
        // Rate limit: ~2 req/s
        await sleep(500);
      }
      addLog("success", `角色复制完成: ${rolesCreated}/${rolesToCopy.length}`);
    }

    // Step 2: Create categories
    if (options.copyCategories) {
      addLog("info", `开始复制分类 (${sourceCategories.length} 个)...`);
      let catIdx = 0;
      for (const cat of sourceCategories) {
        try {
          const newCat = await createChannel(token, targetGuildId, cat.name, 0); // type 0 = category
          categoryIdMap.set(cat.id, newCat.id);
          categoriesCreated++;
          addLog("info", `分类 [${cat.name}] 创建成功`);
        } catch (e: any) {
          errors.push(`分类 [${cat.name}] 创建失败: ${e.message}`);
          addLog("error", `分类 [${cat.name}] 创建失败: ${e.message}`);
        }
        catIdx++;
        onProgress?.({
          step: `复制分类: ${cat.name}`,
          current: catIdx,
          total: sourceCategories.length,
          log: [...log],
        });
        await sleep(500);
      }
      addLog("success", `分类复制完成: ${categoriesCreated}/${sourceCategories.length}`);
    }

    // Step 3: Create channels under categories
    if (options.copyChannels) {
      addLog("info", `开始复制频道 (${sourceTextChannels.length} 个)...`);
      let chIdx = 0;
      for (const ch of sourceTextChannels) {
        try {
          const newParentId = ch.parent_id ? categoryIdMap.get(ch.parent_id) || undefined : undefined;
          const newCh = await createChannel(token, targetGuildId, ch.name, ch.type, newParentId, ch.level);
          channelIdMap.set(ch.id, newCh.id);
          channelsCreated++;
          addLog("info", `频道 [${ch.name}] 创建成功`);

          // Copy topic if exists
          if (ch.topic) {
            try {
              await updateChannel(token, newCh.id, { topic: ch.topic });
            } catch {
              // topic update is non-critical
            }
          }
        } catch (e: any) {
          errors.push(`频道 [${ch.name}] 创建失败: ${e.message}`);
          addLog("error", `频道 [${ch.name}] 创建失败: ${e.message}`);
        }
        chIdx++;
        onProgress?.({
          step: `复制频道: ${ch.name}`,
          current: chIdx,
          total: sourceTextChannels.length,
          log: [...log],
        });
        await sleep(500);
      }
      addLog("success", `频道复制完成: ${channelsCreated}/${sourceTextChannels.length}`);
    }

    // Step 4: Apply channel role permission overwrites
    if (options.copyPermissions) {
      addLog("info", "开始同步频道权限...");
      const allNewChannelIds = [...categoryIdMap.values(), ...channelIdMap.values()];
      let permIdx = 0;
      for (const newChannelId of allNewChannelIds) {
        try {
          await syncChannelRole(token, newChannelId);
          permIdx++;
        } catch (e: any) {
          // Permission sync is non-critical
          addLog("warn", `频道 ${newChannelId} 权限同步失败: ${e.message}`);
        }
        onProgress?.({
          step: `同步权限: ${permIdx}/${allNewChannelIds.length}`,
          current: permIdx,
          total: allNewChannelIds.length,
          log: [...log],
        });
        await sleep(300);
      }
      addLog("success", `权限同步完成: ${permIdx}/${allNewChannelIds.length}`);
    }

    // Step 5: Copy emojis
    if (options.copyEmojis) {
      addLog("info", `开始复制表情 (${sourceEmojis.length} 个)...`);
      let emojiIdx = 0;
      for (const emoji of sourceEmojis) {
        try {
          const emojiBuffer = await downloadEmojiImage(emoji.id);
          await createEmoji(token, targetGuildId, emoji.name, emojiBuffer);
          emojisCreated++;
          addLog("info", `表情 [${emoji.name}] 复制成功`);
        } catch (e: any) {
          errors.push(`表情 [${emoji.name}] 复制失败: ${e.message}`);
          addLog("error", `表情 [${emoji.name}] 复制失败: ${e.message}`);
        }
        emojiIdx++;
        onProgress?.({
          step: `复制表情: ${emoji.name}`,
          current: emojiIdx,
          total: sourceEmojis.length,
          log: [...log],
        });
        await sleep(1000); // emojis are heavier, slower rate
      }
      addLog("success", `表情复制完成: ${emojisCreated}/${sourceEmojis.length}`);
    }

    addLog("success", `迁移完成! 分类 ${categoriesCreated}, 频道 ${channelsCreated}, 角色 ${rolesCreated}, 表情 ${emojisCreated}`);

    return {
      success: true,
      categories: categoriesCreated,
      channels: channelsCreated,
      roles: rolesCreated,
      emojis: emojisCreated,
      errors,
      log,
    };
  } catch (e: any) {
    addLog("error", `迁移失败: ${e.message}`);
    return {
      success: false,
      categories: categoriesCreated,
      channels: channelsCreated,
      roles: rolesCreated,
      emojis: emojisCreated,
      errors: [...errors, e.message],
      log,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Helper: Get user's guilds that the bot is in ===
export async function getBotGuilds(token: string): Promise<KookGuild[]> {
  return getGuildList(token);
}

// === Bot Info & Stats ===

export interface KookBotInfo {
  id: string;
  username: string;
  avatar: string;
  bot: boolean;
  online: boolean;
}

/** Verify a bot token by calling /user/me — returns bot info if valid, throws if invalid */
export async function getBotInfo(token: string): Promise<KookBotInfo> {
  const data = await kookRequest(token, `/user/me`);
  return {
    id: data.id,
    username: data.username,
    avatar: data.avatar || "",
    bot: data.bot ?? false,
    online: data.online ?? false,
  };
}

export interface BotStats {
  serverCount: number;
  memberCount: number;
  channelCount: number;
  guildDetails: Array<{
    id: string;
    name: string;
    memberCount: number;
    channelCount: number;
    onlineUserCount: number;
  }>;
}

/**
 * Fetch real stats for a bot by aggregating across all its guilds.
 * Calls /guild/list, then /guild/view for each guild to get member counts,
 * and /channel/list for each guild to get channel counts.
 */
export async function getBotStats(token: string): Promise<BotStats> {
  const guilds = await getGuildList(token);

  const guildDetails: BotStats["guildDetails"] = [];

  for (const guild of guilds) {
    try {
      // Get detailed guild info (includes member counts)
      const guildDetail = await getGuild(token, guild.id);

      // Get channel list for this guild
      let channelCount = 0;
      try {
        const channels = await getChannelList(token, guild.id);
        channelCount = channels.length;
      } catch {
        // If we can't get channels, skip
      }

      guildDetails.push({
        id: guild.id,
        name: guildDetail?.name || guild.name,
        memberCount: guildDetail?.user_count ?? 0,
        channelCount,
        onlineUserCount: guildDetail?.online_count ?? 0,
      });

      // Rate limit: small delay between guilds
      await sleep(300);
    } catch {
      // Skip guilds we can't access
      guildDetails.push({
        id: guild.id,
        name: guild.name,
        memberCount: 0,
        channelCount: 0,
        onlineUserCount: 0,
      });
    }
  }

  return {
    serverCount: guilds.length,
    memberCount: guildDetails.reduce((sum, g) => sum + g.memberCount, 0),
    channelCount: guildDetails.reduce((sum, g) => sum + g.channelCount, 0),
    guildDetails,
  };
}
