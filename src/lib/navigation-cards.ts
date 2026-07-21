import {
  NAVIGATION_SOURCE_TEMPLATES,
  ServerTemplate,
} from "./server-templates";

type CreatedChannel = { id: string; name: string; type: number };

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

function buildAdaptiveNavigation(
  template: ServerTemplate,
  serverName: string,
  templateId: string,
  channels: CreatedChannel[]
) {
  const skin = SKINS[templateId] || SKINS["eng:starry"];
  const blocks = [skin.title(serverName), "点击下方频道名称即可直达对应频道。"]; 

  for (const category of template.categories) {
    const lines = category.channels
      .map((source) => {
        const created = findCreatedChannel(source.name, channels);
        return created ? skin.line(source.name, `(chn)${created.id}(chn)`) : "";
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
      return created ? `(chn)${created.id}(chn)` : sourceName;
    });
}

export function buildNavigationCard(
  template: ServerTemplate,
  serverName: string,
  cardTemplateId: string,
  channels: CreatedChannel[]
) {
  if (!cardTemplateId || cardTemplateId === "skip") return null;

  let content: string | null = null;
  if (cardTemplateId.startsWith("eng:")) {
    content = buildAdaptiveNavigation(template, serverName, cardTemplateId, channels);
  } else if (cardTemplateId === "random") {
    const available = Object.keys(NAVIGATION_SOURCE_TEMPLATES);
    const selected = available[Math.floor(Math.random() * available.length)];
    content = selected ? buildSourceNavigation(selected, channels) : null;
  } else if (cardTemplateId !== "clone" && cardTemplateId !== "random") {
    content = buildSourceNavigation(cardTemplateId, channels);
  }

  if (!content) {
    content = buildAdaptiveNavigation(template, serverName, "eng:starry", channels);
  }

  return [{
    type: "card",
    theme: "invisible",
    size: "lg",
    modules: [{ type: "section", text: { type: "kmarkdown", content } }],
  }];
}
