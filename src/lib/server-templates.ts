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
}

export interface DecorationStyle {
  id: string;
  name: string;
  preview: string;
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
  return {
    id: String(template.id),
    name: template.name,
    description: template.description || "",
    categories: template.categories.map((category) => ({
      name: category.name,
      channels: category.channels.map((channel) => ({
        name: channel.name,
        type: Number(channel.type) || 1,
      })),
    })),
  };
}

export const ALL_TEMPLATES: ServerTemplate[] = builderData.templates.map(normalizeTemplate);

export const IMPORTED_USER_TEMPLATES = builderData.myTemplates.map((template) => ({
  ...normalizeTemplate(template),
  baseTemplateId: template.baseTemplateId || null,
  imported: true,
}));

export const DECORATION_STYLES: DecorationStyle[] = builderData.styles;

export function decorateCategoryName(name: string, styleId?: string) {
  const style = DECORATION_STYLES.find((item) => item.id === styleId);
  if (!style || style.id === "none") return name;
  return style.preview.replace("示例", name);
}
