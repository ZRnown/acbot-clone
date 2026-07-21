/**
 * Server Templates - predefined guild structures for quick server setup.
 * Each template defines categories and channels that can be created on a target server.
 */

export interface TemplateChannel {
  name: string;
  type: number; // 1 = text, 2 = voice
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

export function getTemplateStats(template: ServerTemplate) {
  const groups = template.categories.length;
  const channels = template.categories.reduce(
    (sum, cat) => sum + cat.channels.length,
    0
  );
  return { groups, categoryCount: groups, channels, channelCount: channels };
}

export const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: "standard-esports",
    name: "标准电竞店",
    description: "适合中小型接单、开黑和陪玩服务器，结构清晰、上手快。",
    source: "ACBot preset",
    categories: [
      {
        name: "公告中心",
        channels: [
          { name: "公告", type: 1, topic: "服务器公告和活动通知" },
          { name: "规则", type: 1, topic: "入群规则和服务须知" },
          { name: "活动", type: 1 },
        ],
      },
      {
        name: "下单大厅",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单通知", type: 1 },
          { name: "订单查询", type: 1 },
          { name: "售后反馈", type: 1 },
        ],
      },
      {
        name: "游戏开黑",
        channels: [
          { name: "三角洲行动 1", type: 2 },
          { name: "三角洲行动 2", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
          { name: "英雄联盟", type: 2 },
        ],
      },
      {
        name: "交流社区",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "游戏讨论", type: 1 },
          { name: "找队友", type: 1 },
          { name: "晒图", type: 1 },
        ],
      },
      {
        name: "运营管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "投诉建议", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "brand-club",
    name: "品牌俱乐部",
    description: "适合有品牌展示、会员体系和多游戏业务的成熟社区。",
    source: "ACBot preset",
    categories: [
      {
        name: "品牌中心",
        channels: [
          { name: "品牌介绍", type: 1 },
          { name: "品牌公告", type: 1 },
          { name: "合作伙伴", type: 1 },
          { name: "加入我们", type: 1 },
        ],
      },
      {
        name: "商城下单",
        channels: [
          { name: "商品橱窗", type: 1 },
          { name: "下单区", type: 1 },
          { name: "VIP 通道", type: 1 },
          { name: "拼团区", type: 1 },
          { name: "订单售后", type: 1 },
        ],
      },
      {
        name: "游戏大厅",
        channels: [
          { name: "三角洲普通", type: 2 },
          { name: "三角洲高级", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
          { name: "APEX", type: 2 },
          { name: "LOL", type: 2 },
        ],
      },
      {
        name: "会员专区",
        channels: [
          { name: "VIP 专属", type: 1 },
          { name: "会员福利", type: 1 },
          { name: "积分商城", type: 1 },
          { name: "等级查询", type: 1 },
        ],
      },
      {
        name: "运营管理",
        channels: [
          { name: "管理公告", type: 1 },
          { name: "数据看板", type: 1 },
          { name: "投诉处理", type: 1 },
        ],
      },
    ],
  },
  {
    id: "peiwan-studio",
    name: "陪玩工作室",
    description: "面向陪玩、排班、评价和结算场景，适合专业团队。",
    source: "ACBot preset",
    categories: [
      {
        name: "工作室",
        channels: [
          { name: "工作室介绍", type: 1 },
          { name: "公告", type: 1 },
          { name: "规则须知", type: 1 },
          { name: "活动", type: 1 },
        ],
      },
      {
        name: "接单区",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单通知", type: 1 },
          { name: "接单记录", type: 1 },
          { name: "订单查询", type: 1 },
        ],
      },
      {
        name: "陪玩管理",
        channels: [
          { name: "陪玩列表", type: 1 },
          { name: "陪玩预约", type: 1 },
          { name: "陪玩评价", type: 1 },
          { name: "请假区", type: 1 },
        ],
      },
      {
        name: "游戏房",
        channels: [
          { name: "三角洲行动", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "英雄联盟", type: 2 },
          { name: "娱乐房", type: 2 },
        ],
      },
      {
        name: "财务运营",
        channels: [
          { name: "结算区", type: 1 },
          { name: "工资查询", type: 1 },
          { name: "数据记录", type: 1 },
          { name: "投诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "game-community",
    name: "游戏开黑社区",
    description: "适合玩家社群、赛事报名、攻略分享和日常开黑。",
    source: "ACBot preset",
    categories: [
      {
        name: "社区入口",
        channels: [
          { name: "社区公告", type: 1 },
          { name: "社区规则", type: 1 },
          { name: "新人报道", type: 1 },
        ],
      },
      {
        name: "开黑大厅",
        channels: [
          { name: "开黑房 1", type: 2 },
          { name: "开黑房 2", type: 2 },
          { name: "开黑房 3", type: 2 },
          { name: "观赛房", type: 2 },
        ],
      },
      {
        name: "赛事活动",
        channels: [
          { name: "赛事公告", type: 1 },
          { name: "报名区", type: 1 },
          { name: "赛程", type: 1 },
          { name: "赛果", type: 1 },
        ],
      },
      {
        name: "交流讨论",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "找队友", type: 1 },
          { name: "游戏攻略", type: 1 },
        ],
      },
      {
        name: "管理区",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "申诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "personal-nest",
    name: "个人小窝",
    description: "小型朋友群和私人空间模板，频道少、管理简单。",
    source: "ACBot preset",
    categories: [
      {
        name: "大厅",
        channels: [
          { name: "公告", type: 1 },
          { name: "闲聊", type: 1 },
          { name: "留言板", type: 1 },
        ],
      },
      {
        name: "游戏",
        channels: [
          { name: "开黑房", type: 2 },
          { name: "娱乐房", type: 2 },
          { name: "观赛房", type: 2 },
        ],
      },
      {
        name: "资源",
        channels: [
          { name: "资源分享", type: 1 },
          { name: "收藏夹", type: 1 },
        ],
      },
      {
        name: "管理",
        channels: [
          { name: "设置", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
];

export const EXTRA_TEMPLATES: ServerTemplate[] = [
  {
    id: "kook-reference-980980",
    name: "KOOK 参考服",
    description: "参考大型公开服务器的分层结构，用于快速搭建完整社区骨架。",
    source: "KOOK 980980",
    categories: Array.from({ length: 6 }, (_, gi) => ({
      name: `参考分组 ${gi + 1}`,
      channels: Array.from({ length: gi < 3 ? 5 : 4 }, (_, ci) => ({
        name: `参考频道 ${gi + 1}-${ci + 1}`,
        type: ci % 3 === 0 ? 2 : 1,
      })),
    })),
  },
];

export const ALL_TEMPLATES: ServerTemplate[] = [...SERVER_TEMPLATES, ...EXTRA_TEMPLATES];
