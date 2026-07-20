#!/bin/bash
# ACBot Clone 部署脚本
# 在服务器 (8.153.160.37) 上运行: bash scripts/deploy.sh
set -e

APP_DIR="/opt/acbot-clone"
REPO_URL="https://github.com/ZRnown/acbot-clone.git"

echo "=== ACBot Clone 部署 ==="

# 首次安装或更新
if [ ! -d "$APP_DIR/.git" ]; then
  echo "首次部署..."
  mkdir -p "$APP_DIR"
  cd "$APP_DIR"
  git clone "$REPO_URL" .
else
  echo "更新现有部署..."
  cd "$APP_DIR"
  git pull origin main || git pull origin master || true
fi

# 确保 .env 存在
if [ ! -f "$APP_DIR/.env" ]; then
  echo "创建 .env 文件..."
  cat > "$APP_DIR/.env" << 'EOF'
JWT_SECRET=acbot-kook-migrate-secret-2026
DATA_DIR=data
EOF
fi

# 安装依赖
echo "安装依赖..."
npm ci --production=false

# 构建
echo "构建..."
npm run build

# 初始化数据库（确保 tangtang 账号存在）
echo "初始化数据库..."
node scripts/init-db.js 2>/dev/null || npx tsx scripts/init-db.ts 2>/dev/null || echo "警告: init-db 需要手动运行"

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo "安装 PM2..."
  npm install -g pm2
fi

# 启动或重启
echo "启动应用..."
pm2 describe acbot-clone > /dev/null 2>&1 && pm2 restart acbot-clone || pm2 start "npm run start" --name acbot-clone --cwd "$APP_DIR"

# 保存 PM2 进程列表
pm2 save

echo "=== 部署完成 ==="
echo "应用运行在 http://localhost:3000"
echo "查看日志: pm2 logs acbot-clone"
echo "默认账号: tangtang / tangtang127"
