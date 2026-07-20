# ACBot Clone - KOOK 社区管理工具

基于 acbot.top 的克隆项目，实现了完整的 KOOK 社区管理工具，包含服务器搬运（迁移）功能。

## 功能

- **用户系统**：注册、登录、多账号支持、密码修改
- **机器人管理**：添加/删除/上下线机器人，绑定 KOOK 服务器
- **服务器搭建工具（核心功能）**：一键将源服务器的频道分类、子频道、角色权限和表情包复制到目标服务器
- **控制台**：总览仪表盘、机器人列表、设置

## 技术栈

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS v4
- KOOK HTTP API v3
- JSON 文件存储（轻量级，无需数据库）

## 快速开始

```bash
npm install
npm run build
npm run start
```

访问 http://localhost:3000

默认账号: tangtang / tangtang127

## 服务器搭建工具

### 支持的搬运功能

1. **一键搬运频道** - 从源服务器复制频道结构到目标服务器
   - 频道分类（Categories）
   - 子频道（文字/语音）
   - 角色权限
   - 表情包（自动下载上传）

2. **一键清空服务器** - 删除所有频道和角色
3. **一键锁死/解锁** - 服务器权限管理
4. **搬运卡片消息** - 转发含自定义表情的卡片消息
5. **表情库上传** - 批量上传预设表情包

### KOOK API 接口

| 功能 | API 端点 |
|------|----------|
| 获取频道列表 | `/api/v3/channel/list` |
| 创建频道/分类 | `/api/v3/channel/create` |
| 编辑频道 | `/api/v3/channel/update` |
| 删除频道 | `/api/v3/channel/delete` |
| 获取表情列表 | `/api/v3/guild-emoji/list` |
| 创建表情 | `/api/v3/guild-emoji/create` |
| 角色管理 | `/api/v3/guild-role/*` |
| 频道权限 | `/api/v3/channel-role/*` |
| 服务器详情 | `/api/v3/guild/view` |

### 搬运顺序
角色 → 分类 → 子频道 → 频道权限 → 表情包

### 权限要求
机器人需要同时存在于源服务器和目标服务器，并拥有：
- 频道管理
- 管理角色
- 管理自定义表情

## 部署

```bash
# 在服务器上
git clone https://github.com/ZRnown/acbot-clone.git /opt/acbot-clone
cd /opt/acbot-clone
npm install
npm run build
node scripts/init-db.js  # 初始化数据库（创建 tangtang 账号）
pm2 start "npm run start" --name acbot-clone
```

更新：
```bash
cd /opt/acbot-clone
git pull origin main
npm install
npm run build
node scripts/init-db.js  # 可选：重置密码
pm2 restart acbot-clone
```

## 环境变量

```env
JWT_SECRET=your-secret-key
DATA_DIR=data
```

## License

MIT
