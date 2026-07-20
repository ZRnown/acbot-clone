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

## 服务器搬运功能说明

服务器搭建工具使用 KOOK HTTP API v3 实现以下功能：

1. **频道分类**：`/api/v3/channel/create` (type=0 创建分类)
2. **子频道**：`/api/v3/channel/create` (type=1 文字, type=2 语音)
3. **角色**：`/api/v3/guild-role/create` 创建角色并设置权限
4. **频道权限**：`/api/v3/channel-role/sync` 同步频道权限覆盖
5. **表情包**：`/api/v3/guild-emoji/list` + `/create` 下载源表情并上传到目标

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
git clone https://github.com/JCodesMore/acbot-clone.git
cd acbot-clone
npm install
npm run build
pm2 start "npm run start" --name acbot-clone
```

更新：
```bash
git pull
npm install
npm run build
pm2 restart acbot-clone
```
