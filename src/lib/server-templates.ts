import builderData from "./acbot-builder-data.json";

export interface TemplateChannel {
  name: string;
  type: number;
  topic?: string;
}

export interface TemplateCategory {
  name: string;
  channels: TemplateChannel[];
}

export interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  source?: string;
  categories: TemplateCategory[];
  navigationTargetName?: string;
}

function compactChannelName(name: string) {
  return name.replace(/\s+/g, "").toLowerCase();
}

export function inferNavigationChannelName(categories: TemplateCategory[]) {
  const candidates = categories.flatMap((category, categoryIndex) =>
    category.channels
      .filter((channel) => channel.type === 1 || channel.type === 4)
      .map((channel, channelIndex) => ({ channel, categoryIndex, channelIndex }))
  );
  const score = (name: string) => {
    const compact = compactChannelName(name);
    if (compact.includes("\u4f20\u9001\u5bfc\u822a")) return 1000;
    if (compact.includes("\u4e00\u952e\u5bfc\u822a")) return 950;
    if (compact.includes("\u9891\u9053\u5bfc\u822a")) return 900;
    if (compact.includes("\u4f7f\u7528\u5bfc\u822a") || compact.includes("\u6e38\u73a9\u5bfc\u822a")) return 850;
    if (compact.includes("\u5bfc\u822a") || compact.includes("\u6307\u5f15") || compact.includes("\u6307\u8def")) return 800;
    if (compact.includes("\u4f20\u9001\u95e8")) return 700;
    if (compact.includes("\u6b22\u8fce\u5927\u5385")) return 500;
    if (compact.includes("\u516c\u544a")) return 400;
    return 0;
  };
  return candidates.sort((a, b) =>
    (score(b.channel.name) - score(a.channel.name))
    || (a.categoryIndex - b.categoryIndex)
    || (a.channelIndex - b.channelIndex)
  )[0]?.channel.name;
}

export interface DecorationStyle {
  id: string;
  name: string;
  preview: string;
}

export interface NavigationCardTemplate {
  id: string;
  name: string;
  description: string;
}

export interface NavigationSourceTemplate {
  navContent: string;
  channelMap: Record<string, string>;
  navType?: number;
}

type ImportedTemplate = Omit<ServerTemplate, "description"> & {
  description?: string;
  baseTemplateId?: string;
};

export function getTemplateStats(template: ServerTemplate) {
  const groups = template.categories.length;
  const channels = template.categories.reduce(
    (sum, category) => sum + category.channels.length,
    0
  );
  return { groups, categoryCount: groups, channels, channelCount: channels };
}

function normalizeTemplate(template: ImportedTemplate): ServerTemplate {
  const categories = template.categories.map((category) => ({
    name: category.name,
    channels: category.channels.map((channel) => ({
      name: channel.name,
      type: Number(channel.type) || 1,
    })),
  }));
  return {
    id: String(template.id),
    name: template.name,
    description: template.description || "",
    categories,
    navigationTargetName: inferNavigationChannelName(categories),
  };
}

export const ALL_TEMPLATES: ServerTemplate[] = builderData.templates.map(normalizeTemplate);

export const IMPORTED_USER_TEMPLATES = builderData.myTemplates.map((template) => ({
  ...normalizeTemplate(template),
  baseTemplateId: template.baseTemplateId || null,
  imported: true,
}));

export const DECORATION_STYLES: DecorationStyle[] = builderData.styles;

export const NAVIGATION_CARD_TEMPLATES: NavigationCardTemplate[] = builderData.cardTemplates;

export const NAVIGATION_SOURCE_TEMPLATES: Record<string, NavigationSourceTemplate> =
  builderData.navigationTemplates;

export function decorateCategoryName(name: string, styleId?: string) {
  const style = DECORATION_STYLES.find((item) => item.id === styleId);
  if (!style || style.id === "none") return name;
  return style.preview.replace("示例", name);
}
