/**
 * Server Templates - predefined guild structures for quick server setup.
 * Each template defines categories and channels that can be created on a target server.
 */

export interface TemplateChannel {
  name: string;
  type: number; // 1=文字, 2=语音
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
  source?: string; // KOOK server reference
  categories: TemplateCategory[];
}

export function getTemplateStats(template: ServerTemplate) {
  const groups = template.categories.length;
  const channels = template.categories.reduce(
    (sum, cat) => sum + cat.channels.length,
    0
  );
  return { groups, channels };
}

export const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: "standard-esports",
    name: "标准电竞店",
    description: "6分组25频道，中小型店铺",
    categories: [
      {
        name: "📢 公告区",
        channels: [
          { name: "公告", type: 1, topic: "店铺公告与活动通知" },
          { name: "规则", type: 1, topic: "店铺规则与须知" },
          { name: "活动", type: 1 },
        ],
      },
      {
        name: "🛒 下单区",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单通知", type: 1 },
          { name: "订单查询", type: 1 },
          { name: "售后反馈", type: 1 },
        ],
      },
      {
        name: "🎮 游戏区",
        channels: [
          { name: "三角洲行动", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
          { name: "英雄联盟", type: 2 },
          { name: "开黑1号房", type: 2 },
          { name: "开黑2号房", type: 2 },
        ],
      },
      {
        name: "💬 交流区",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "闲聊灌水", type: 1 },
          { name: "游戏讨论", type: 1 },
          { name: "找队友", type: 1 },
        ],
      },
      {
        name: "👤 陪玩区",
        channels: [
          { name: "陪玩列表", type: 1 },
          { name: "陪玩预约", type: 1 },
          { name: "陪玩评价", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理区",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "投诉建议", type: 1 },
          { name: " logs", type: 1 },
        ],
      },
    ],
  },
  {
    id: "brand-club",
    name: "品牌俱乐部",
    description: "5分组30频道，有规模的品牌店",
    categories: [
      {
        name: "📌 品牌中心",
        channels: [
          { name: "品牌介绍", type: 1 },
          { name: "品牌公告", type: 1 },
          { name: "加入我们", type: 1 },
          { name: "合作伙伴", type: 1 },
          { name: "荣誉墙", type: 1 },
        ],
      },
      {
        name: "🛍️ 商城下单",
        channels: [
          { name: "商品橱窗", type: 1 },
          { name: "下单区", type: 1 },
          { name: "VIP通道", type: 1 },
          { name: "拼团区", type: 1 },
          { name: "秒杀区", type: 1 },
          { name: "订单售后", type: 1 },
        ],
      },
      {
        name: "🔫 游戏大厅",
        channels: [
          { name: "三角洲-普通", type: 2 },
          { name: "三角洲-高级", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
          { name: "APEX", type: 2 },
          { name: "LOL", type: 2 },
          { name: "娱乐房1", type: 2 },
          { name: "娱乐房2", type: 2 },
        ],
      },
      {
        name: "🌟 会员区",
        channels: [
          { name: "VIP专属", type: 1 },
          { name: "会员福利", type: 1 },
          { name: "积分商城", type: 1 },
          { name: "会员活动", type: 1 },
          { name: "等级查询", type: 1 },
        ],
      },
      {
        name: "📢 社区",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "游戏交流", type: 1 },
          { name: "吐槽区", type: 1 },
          { name: "交友", type: 1 },
          { name: "管理公告", type: 1 },
          { name: "投诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "flagship-esports",
    name: "旗舰电竞帝国",
    description: "4分组28频道，顶级品牌满配",
    categories: [
      {
        name: "👑 旗舰大厅",
        channels: [
          { name: "旗舰店公告", type: 1 },
          { name: "品牌故事", type: 1 },
          { name: "旗舰活动", type: 1 },
          { name: "VIP专属入口", type: 1 },
          { name: "至尊下单", type: 1 },
          { name: "至尊售后", type: 1 },
          { name: "至尊评价", type: 1 },
        ],
      },
      {
        name: "🎮 至尊游戏区",
        channels: [
          { name: "三角洲-至尊", type: 2 },
          { name: "三角洲-精英", type: 2 },
          { name: "无畏契约-高端", type: 2 },
          { name: "CS2-竞技", type: 2 },
          { name: "LOL-大师", type: 2 },
          { name: "APEX-猎杀", type: 2 },
          { name: "至尊娱乐房", type: 2 },
        ],
      },
      {
        name: "💎 会员尊享",
        channels: [
          { name: "至尊会员", type: 1 },
          { name: "积分兑换", type: 1 },
          { name: "会员日", type: 1 },
          { name: "专属福利", type: 1 },
          { name: "等级通道", type: 1 },
          { name: "生日特权", type: 1 },
          { name: "会员投诉", type: 1 },
        ],
      },
      {
        name: "⚙️ 运营管理",
        channels: [
          { name: "店长通道", type: 1 },
          { name: "员工通道", type: 1 },
          { name: "运营数据", type: 1 },
          { name: "日志", type: 1 },
          { name: "管理培训", type: 1 },
          { name: "招聘", type: 1 },
          { name: "投诉处理", type: 1 },
        ],
      },
    ],
  },
  {
    id: "personal-nest",
    name: "个人小窝",
    description: "4分组12频道，温馨个人空间",
    categories: [
      {
        name: "🏠 大厅",
        channels: [
          { name: "公告", type: 1 },
          { name: "闲聊", type: 1 },
          { name: "留言板", type: 1 },
        ],
      },
      {
        name: "🎮 游戏",
        channels: [
          { name: "开黑房", type: 2 },
          { name: "娱乐房", type: 2 },
          { name: "观赛房", type: 2 },
        ],
      },
      {
        name: "📂 资源",
        channels: [
          { name: "资源分享", type: 1 },
          { name: "收藏夹", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "设置", type: 1 },
          { name: "管理", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "道具铺",
    name: "商行道具铺",
    description: "6分组18频道，游戏道具交易",
    categories: [
      {
        name: "📢 公告",
        channels: [
          { name: "店铺公告", type: 1 },
          { name: "交易规则", type: 1 },
          { name: "防骗指南", type: 1 },
        ],
      },
      {
        name: "🛒 交易区",
        channels: [
          { name: "出售大厅", type: 1 },
          { name: "求购大厅", type: 1 },
          { name: "交易完成", type: 1 },
        ],
      },
      {
        name: "💎 道具分类",
        channels: [
          { name: "三角洲道具", type: 1 },
          { name: "CS2饰品", type: 1 },
          { name: "LOL皮肤", type: 1 },
        ],
      },
      {
        name: "🎮 开黑",
        channels: [
          { name: "开黑房1", type: 2 },
          { name: "开黑房2", type: 2 },
          { name: "娱乐房", type: 2 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "道具估价", type: 1 },
          { name: "晒单", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "申诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "game-community",
    name: "游戏开黑社区",
    description: "5分组16频道，游戏社区开黑群",
    categories: [
      {
        name: "📢 社区",
        channels: [
          { name: "社区公告", type: 1 },
          { name: "社区规则", type: 1 },
          { name: "新人报道", type: 1 },
        ],
      },
      {
        name: "🎮 开黑",
        channels: [
          { name: "开黑房1", type: 2 },
          { name: "开黑房2", type: 2 },
          { name: "开黑房3", type: 2 },
          { name: "观赛房", type: 2 },
        ],
      },
      {
        name: "🏆 赛事",
        channels: [
          { name: "赛事公告", type: 1 },
          { name: "报名区", type: 1 },
          { name: "赛果", type: 1 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "找队友", type: 1 },
          { name: "游戏攻略", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "申诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "peiwan-studio",
    name: "陪玩工作室",
    description: "7分组28频道，专业陪玩团队",
    categories: [
      {
        name: "📢 工作室",
        channels: [
          { name: "工作室介绍", type: 1 },
          { name: "公告", type: 1 },
          { name: "规则须知", type: 1 },
          { name: "活动", type: 1 },
        ],
      },
      {
        name: "🛒 接单区",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单通知", type: 1 },
          { name: "接单记录", type: 1 },
          { name: "订单查询", type: 1 },
        ],
      },
      {
        name: "👤 陪玩",
        channels: [
          { name: "陪玩列表", type: 1 },
          { name: "陪玩预约", type: 1 },
          { name: "陪玩评价", type: 1 },
          { name: "请假区", type: 1 },
        ],
      },
      {
        name: "🎮 游戏房",
        channels: [
          { name: "三角洲1", type: 2 },
          { name: "三角洲2", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "LOL", type: 2 },
        ],
      },
      {
        name: "💰 财务",
        channels: [
          { name: "结算区", type: 1 },
          { name: "工资查询", type: 1 },
          { name: "提成", type: 1 },
        ],
      },
      {
        name: "💬 内部",
        channels: [
          { name: "内部交流", type: 1 },
          { name: "培训区", type: 1 },
          { name: "会议", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
          { name: "招聘", type: 1 },
        ],
      },
    ],
  },
  {
    id: "event-community",
    name: "活动赛事社区",
    description: "6分组20频道，赛事组织活动社区",
    categories: [
      {
        name: "📢 社区",
        channels: [
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
          { name: "新人", type: 1 },
        ],
      },
      {
        name: "🏆 赛事",
        channels: [
          { name: "赛事公告", type: 1 },
          { name: "报名", type: 1 },
          { name: "赛程", type: 1 },
          { name: "赛果", type: 1 },
        ],
      },
      {
        name: "🎮 比赛",
        channels: [
          { name: "比赛房1", type: 2 },
          { name: "比赛房2", type: 2 },
          { name: "观赛房", type: 2 },
        ],
      },
      {
        name: "👥 战队",
        channels: [
          { name: "战队列表", type: 1 },
          { name: "战队招募", type: 1 },
          { name: "战队管理", type: 1 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "赛事讨论", type: 1 },
          { name: "找队友", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "裁判区", type: 1 },
          { name: "申诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "anime-community",
    name: "二次元兴趣社区",
    description: "6分组18频道，动漫兴趣爱好",
    categories: [
      {
        name: "📢 社区",
        channels: [
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
          { name: "新人", type: 1 },
        ],
      },
      {
        name: "📺 动漫",
        channels: [
          { name: "新番讨论", type: 1 },
          { name: "老番回忆", type: 1 },
          { name: "推荐区", type: 1 },
        ],
      },
      {
        name: "🎨 创作",
        channels: [
          { name: "同人图", type: 1 },
          { name: "写文区", type: 1 },
          { name: "翻唱", type: 1 },
        ],
      },
      {
        name: "🎮 游戏",
        channels: [
          { name: "开黑房", type: 2 },
          { name: "原神", type: 2 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "闲聊灌水", type: 1 },
          { name: "交友", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "compact-esports",
    name: "精简护航店",
    description: "5分组20频道，麻雀虽小五脏俱全",
    categories: [
      {
        name: "📢 公告",
        channels: [
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
          { name: "活动", type: 1 },
          { name: "导航", type: 1 },
        ],
      },
      {
        name: "🛒 下单",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单", type: 1 },
          { name: "查询", type: 1 },
          { name: "售后", type: 1 },
        ],
      },
      {
        name: "🎮 开黑",
        channels: [
          { name: "三角洲1", type: 2 },
          { name: "三角洲2", type: 2 },
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "找队友", type: 1 },
          { name: "评价", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "full-esports",
    name: "全能大店",
    description: "7分组32频道，一步到位全配置",
    categories: [
      {
        name: "📢 公告区",
        channels: [
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
          { name: "活动", type: 1 },
          { name: "导航", type: 1 },
        ],
      },
      {
        name: "🛒 下单区",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单通知", type: 1 },
          { name: "VIP通道", type: 1 },
          { name: "订单查询", type: 1 },
          { name: "售后", type: 1 },
        ],
      },
      {
        name: "🎮 三角洲",
        channels: [
          { name: "三角洲-普通1", type: 2 },
          { name: "三角洲-普通2", type: 2 },
          { name: "三角洲-高级", type: 2 },
          { name: "三角洲-至尊", type: 2 },
        ],
      },
      {
        name: "🔫 其他游戏",
        channels: [
          { name: "无畏契约", type: 2 },
          { name: "CS2", type: 2 },
          { name: "LOL", type: 2 },
          { name: "APEX", type: 2 },
        ],
      },
      {
        name: "👤 陪玩",
        channels: [
          { name: "陪玩列表", type: 1 },
          { name: "预约", type: 1 },
          { name: "评价", type: 1 },
          { name: "请假", type: 1 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "闲聊", type: 1 },
          { name: "找队友", type: 1 },
          { name: "晒单", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "运营数据", type: 1 },
          { name: "招聘", type: 1 },
          { name: "日志", type: 1 },
          { name: "投诉", type: 1 },
        ],
      },
    ],
  },
  {
    id: "delta-shop",
    name: "三角洲专属店",
    description: "6分组26频道，三角洲行动专业护航",
    categories: [
      {
        name: "📢 公告",
        channels: [
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
          { name: "价格表", type: 1 },
          { name: "活动", type: 1 },
        ],
      },
      {
        name: "🛒 下单",
        channels: [
          { name: "下单大厅", type: 1 },
          { name: "派单", type: 1 },
          { name: "VIP通道", type: 1 },
          { name: "查询", type: 1 },
          { name: "售后", type: 1 },
        ],
      },
      {
        name: "🎮 普通护航",
        channels: [
          { name: "普通1", type: 2 },
          { name: "普通2", type: 2 },
          { name: "普通3", type: 2 },
          { name: "普通4", type: 2 },
        ],
      },
      {
        name: "💎 高级护航",
        channels: [
          { name: "高级1", type: 2 },
          { name: "高级2", type: 2 },
          { name: "至尊1", type: 2 },
          { name: "至尊2", type: 2 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "找队友", type: 1 },
          { name: "攻略", type: 1 },
          { name: "晒单", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "护航记录", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "dispatcher-studio",
    name: "派单工作室",
    description: "6分组24频道，以派单为核心的工作室",
    categories: [
      {
        name: "📢 工作室",
        channels: [
          { name: "介绍", type: 1 },
          { name: "公告", type: 1 },
          { name: "规则", type: 1 },
        ],
      },
      {
        name: "📋 派单",
        channels: [
          { name: "派单大厅", type: 1 },
          { name: "接单区", type: 1 },
          { name: "完成区", type: 1 },
          { name: "异常处理", type: 1 },
        ],
      },
      {
        name: "🎮 游戏房",
        channels: [
          { name: "三角洲1", type: 2 },
          { name: "三角洲2", type: 2 },
          { name: "三角洲3", type: 2 },
          { name: "无畏契约", type: 2 },
        ],
      },
      {
        name: "👤 人员",
        channels: [
          { name: "陪玩列表", type: 1 },
          { name: "排班表", type: 1 },
          { name: "请假", type: 1 },
          { name: "评价", type: 1 },
        ],
      },
      {
        name: "💬 交流",
        channels: [
          { name: "内部交流", type: 1 },
          { name: "客户聊天", type: 1 },
          { name: "培训", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "数据", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
  {
    id: "vip-luxury",
    name: "VIP豪华店",
    description: "7分组30频道，完整VIP体系的高端店",
    categories: [
      {
        name: "👑 豪华大厅",
        channels: [
          { name: "豪华公告", type: 1 },
          { name: "品牌介绍", type: 1 },
          { name: "活动", type: 1 },
          { name: "导航", type: 1 },
        ],
      },
      {
        name: "💎 VIP区",
        channels: [
          { name: "VIP下单", type: 1 },
          { name: "至尊下单", type: 1 },
          { name: "VIP查询", type: 1 },
          { name: "VIP售后", type: 1 },
        ],
      },
      {
        name: "🎮 尊享游戏",
        channels: [
          { name: "三角洲-VIP", type: 2 },
          { name: "三角洲-至尊", type: 2 },
          { name: "无畏契约-VIP", type: 2 },
          { name: "CS2-VIP", type: 2 },
        ],
      },
      {
        name: "👤 陪玩",
        channels: [
          { name: "金牌陪玩", type: 1 },
          { name: "预约", type: 1 },
          { name: "评价", type: 1 },
          { name: "请假", type: 1 },
        ],
      },
      {
        name: "🎁 会员",
        channels: [
          { name: "会员通道", type: 1 },
          { name: "积分商城", type: 1 },
          { name: "会员福利", type: 1 },
        ],
      },
      {
        name: "💬 社交",
        channels: [
          { name: "综合聊天", type: 1 },
          { name: "交友", type: 1 },
          { name: "晒单", type: 1 },
        ],
      },
      {
        name: "⚙️ 管理",
        channels: [
          { name: "管理通道", type: 1 },
          { name: "数据", type: 1 },
          { name: "招聘", type: 1 },
          { name: "投诉", type: 1 },
          { name: "日志", type: 1 },
        ],
      },
    ],
  },
];

// Additional templates referenced from real KOOK servers
// These are simplified representations
export const EXTRA_TEMPLATES: ServerTemplate[] = [
  {
    id: "noob-huaguoshan",
    name: "Noob 花果山风格",
    description: "9分组34频道，来自KOOK 980980号服务器",
    source: "KOOK 980980",
    categories: Array.from({ length: 9 }, (_, gi) => ({
      name: `分组${gi + 1}`,
      channels: Array.from({ length: gi < 4 ? 4 : 3 }, (_, ci) => ({
        name: `频道${gi + 1}-${ci + 1}`,
        type: ci % 2 === 0 ? 1 : 2,
      })),
    })),
  },
];

// Merge all templates
export const ALL_TEMPLATES: ServerTemplate[] = [...SERVER_TEMPLATES, ...EXTRA_TEMPLATES];
