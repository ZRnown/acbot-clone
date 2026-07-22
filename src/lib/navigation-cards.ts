import {
  NAVIGATION_SOURCE_TEMPLATES,
  ServerTemplate,
} from "./server-templates";

type CreatedChannel = { id: string; name: string; type: number; inviteUrl?: string };

type NavigationSkin = {
  title: (name: string) => string;
  section: (name: string) => string;
  line: (name: string, target: string) => string;
  footer: (name: string) => string;
};

const SKINS: Record<string, NavigationSkin> = {
  "eng:starry": {
    title: (name) => `· ┈┈ ⨯.⁺ ┈┈┈┈┈ ⟡ ✦ ${name} ✦ ⟡ ┈┈┈┈┈ ⁺.⨯ ┈┈ ·`,
    section: (name) => `· ┈┈ ⨯.⁺ ┈┈ ⟡ **${name}** ⟡ ┈┈ ⁺.⨯ ┈┈ ·`,
    line: (name, target) => `　　　✦　***${name}***　　${target}`,
    footer: (name) => `· ┈┈ ⟡ ✦ ${name} · 陪你赢 ✦ ⟡ ┈┈ ·`,
  },
  "eng:lovely": {
    title: (name) => `✦ · ── ♡₊˚ **${name}** ˚₊♡ ── · ✦`,
    section: (name) => `♡₊˚ ┈┈ **${name}** ┈┈ ˚₊♡`,
    line: (name, target) => `　♡　${name}　${target}`,
    footer: (name) => `✦ · ── ♡ ${name} ♡ ── · ✦`,
  },
  "eng:minimal": {
    title: (name) => `—— ${name} ——`,
    section: (name) => `┌ ${name} ┐`,
    line: (name, target) => `│ ${name}　${target}`,
    footer: (name) => `—— ${name} · END ——`,
  },
  "eng:prism": {
    title: (name) => `◇━━━ ✦ **${name}** ✦ ━━━◇`,
    section: (name) => `◇ ── ‹ ${name} › ── ◇`,
    line: (name, target) => `　◇ ${name}　${target}`,
    footer: (name) => `◇━━━ ${name} ━━━◇`,
  },
  "eng:moon": {
    title: (name) => `☾ ┈┈┈ **${name}** ┈┈┈ ☽`,
    section: (name) => `☾ · ${name} · ☽`,
    line: (name, target) => `　☽ ${name}　${target}`,
    footer: (name) => `☾ ${name} · 月下相逢 ☽`,
  },
  "eng:royal": {
    title: (name) => `♛ ═══ **${name}** ═══ ♛`,
    section: (name) => `♕ ── ${name} ── ♕`,
    line: (name, target) => `　♔ ${name}　${target}`,
    footer: (name) => `♛ ${name} · 尊享服务 ♛`,
  },
  "eng:ocean": {
    title: (name) => `≋≋≋ 🌊 **${name}** 🌊 ≋≋≋`,
    section: (name) => `𓆝 ┈ ${name} ┈ 𓆟`,
    line: (name, target) => `　𓇼 ${name}　${target}`,
    footer: (name) => `≋ ${name} · 深海相遇 ≋`,
  },
  "eng:sakura": {
    title: (name) => `✿ ┈┈ **${name}** ┈┈ ✿`,
    section: (name) => `❀ · ${name} · ❀`,
    line: (name, target) => `　🌸 ${name}　${target}`,
    footer: (name) => `✿ ${name} · 花开有期 ✿`,
  },
  "eng:neon": {
    title: (name) => `✦ // **${name}** // ✦`,
    section: (name) => `▰ ${name} ▰`,
    line: (name, target) => `　› ${name}　${target}`, 
    footer: (name) => `✦ ${name} // ONLINE ✦`,
  },
  "eng:classic": {
    title: (name) => `╔════ **${name}** ════╗`,
    section: (name) => `╠══ ${name} ══╣`,
    line: (name, target) => `║ ${name}　${target}`,
    footer: (name) => `╚════ ${name} ════╝`,
  },
};

function normalizeName(name: string) {
  return name.replace(/\s+/g, "").replace(/[\\`*_~|]/g, "").toLowerCase();
}

function findCreatedChannel(sourceName: string, channels: CreatedChannel[]) {
  const wanted = normalizeName(sourceName);
  return channels.find((channel) => normalizeName(channel.name) === wanted)
    || channels.find((channel) => {
      const current = normalizeName(channel.name);
      return current.includes(wanted) || wanted.includes(current);
    });
}

function channelReference(channel: CreatedChannel | undefined, fallbackName: string) {
  if (channel?.type === 2 && channel.inviteUrl) return `[${channel.name}](${channel.inviteUrl})`;
  return channel
    ? `(chn)${channel.id}(chn)`
    : fallbackName;
}

function buildAdaptiveNavigation(
  template: ServerTemplate,
  serverName: string,
  templateId: string,
  channels: CreatedChannel[],
  emojiIds: Map<string, string> = new Map()
) {
  const skin = SKINS[templateId] || SKINS["eng:starry"];
  const firstEmoji = emojiIds.entries().next().value as [string, string] | undefined;
  const marker = firstEmoji ? `(emj)${firstEmoji[1]}(emj)[${firstEmoji[0]}]` : "";
  const blocks = [skin.title(serverName), "点击下方频道名称即可直达对应频道。"]; 

  if (marker) blocks[0] = `${marker}  ${blocks[0]}  ${marker}`;

  for (const category of template.categories) {
    const lines = category.channels
      .map((source) => {
        const created = findCreatedChannel(source.name, channels);
        const line = created ? skin.line(source.name, channelReference(created, source.name)) : "";
        return line && marker ? `${marker} ${line}` : line;
      })
      .filter(Boolean);
    if (lines.length) blocks.push(skin.section(category.name.replaceAll("{name}", serverName)), lines.join("\n"));
  }

  blocks.push(skin.footer(serverName));
  return blocks.join("\n\n");
}

function buildSourceNavigation(templateId: string, channels: CreatedChannel[]) {
  const source = NAVIGATION_SOURCE_TEMPLATES[templateId];
  if (!source) return null;

  return source.navContent
    .replace(/\(emj\)[^(]*\(emj\)\[[^\]]*\]/g, "✦")
    .replace(/\(chn\)(\d+)\(chn\)/g, (_match, oldId: string) => {
      const sourceName = source.channelMap[oldId];
      if (!sourceName) return "";
      const created = findCreatedChannel(sourceName, channels);
      return channelReference(created, sourceName);
    });
}

function buildMappedSourceNavigation(
  templateId: string,
  channels: CreatedChannel[],
  emojiIds: Map<string, string>
) {
  const source = NAVIGATION_SOURCE_TEMPLATES[templateId];
  if (!source) return null;
  return source.navContent
    .replace(/\(emj\)([^()]*)\(emj\)\[([^\]]*)\]/g, (match, _oldId: string, name: string) => {
      const newId = emojiIds.get(name);
      return newId ? `(emj)${newId}(emj)[${name}]` : match;
    })
    .replace(/\(chn\)(\d+)\(chn\)/g, (_match, oldId: string) => {
      const sourceName = source.channelMap[oldId];
      if (!sourceName) return "";
      return channelReference(findCreatedChannel(sourceName, channels), sourceName);
    });
}

export function buildNavigationCard(
  template: ServerTemplate,
  serverName: string,
  cardTemplateId: string,
  channels: CreatedChannel[],
  emojiIds: Map<string, string> = new Map()
) {
  if (!cardTemplateId || cardTemplateId === "skip") return null;

  let content: string | null = null;
  if (cardTemplateId.startsWith("eng:")) {
    content = buildAdaptiveNavigation(template, serverName, cardTemplateId, channels, emojiIds);
  } else if (cardTemplateId === "random") {
    const available = Object.keys(NAVIGATION_SOURCE_TEMPLATES);
    const selected = available[Math.floor(Math.random() * available.length)];
    content = selected ? buildMappedSourceNavigation(selected, channels, emojiIds) : null;
  } else if (cardTemplateId !== "clone" && cardTemplateId !== "random") {
    content = buildMappedSourceNavigation(cardTemplateId, channels, emojiIds);
  }

  if (!content) {
    content = buildAdaptiveNavigation(template, serverName, "eng:starry", channels, emojiIds);
  }

  // Imported navigation templates may already contain a complete KOOK card array.
  // Return that card structure directly instead of displaying its JSON as KMarkdown.
  if (content.trimStart().startsWith("[")) {
    try {
      const cards = JSON.parse(content);
      if (Array.isArray(cards)) return cards;
    } catch {
      // Fall through to a plain KMarkdown card for malformed legacy templates.
    }
  }

  return [{
    type: "card",
    theme: "invisible",
    size: "lg",
    modules: [{ type: "section", text: { type: "kmarkdown", content } }],
  }];
}

function splitKMarkdown(content: string, limit = 2400) {
  if (content.length <= limit) return [content];
  const parts: string[] = [];
  let current = "";
  for (const paragraph of content.split("\n\n")) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) parts.push(current);
    if (paragraph.length <= limit) {
      current = paragraph;
    } else {
      for (let index = 0; index < paragraph.length; index += limit) {
        parts.push(paragraph.slice(index, index + limit));
      }
      current = "";
    }
  }
  if (current) parts.push(current);
  return parts;
}

export function splitNavigationCardMessages(cards: unknown[]): unknown[][] {
  const messages: unknown[][] = [];
  for (const rawCard of cards) {
    const card = rawCard as Record<string, any>;
    const modules = Array.isArray(card.modules) ? card.modules : [];
    const baseCard = { ...card };
    delete baseCard.modules;
    for (const module of modules) {
      const content = module?.text?.type === "kmarkdown" ? module.text.content : null;
      const pieces = typeof content === "string" ? splitKMarkdown(content) : [null];
      for (const piece of pieces) {
        const nextModule = piece === null
          ? module
          : { ...module, text: { ...module.text, content: piece } };
        messages.push([{ ...baseCard, modules: [nextModule] }]);
      }
    }
    if (modules.length === 0) messages.push([card]);
  }
  return messages.length ? messages : [cards];
}
