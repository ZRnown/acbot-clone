#!/bin/bash
# Deployment script for ACBot Clone
# Run on the server (8.153.160.37) to set up and update the app

set -e

APP_DIR="/opt/acbot-clone"
NODE_VERSION="20"

echo "=== ACBot Clone Deployment ==="

# Check if first install
if [ ! -d "$APP_DIR" ]; then
  echo "First-time setup..."
  mkdir -p "$APP_DIR"
  cd "$APP_DIR"
  git clone https://github.com/JCodesMore/acbot-clone.git .
else
  echo "Updating existing deployment..."
  cd "$APP_DIR"
  git pull origin main
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build
echo "Building..."
npm run build

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Start or restart the app
echo "Starting app..."
pm2 describe acbot-clone > /dev/null 2>&1 && pm2 restart acbot-clone || pm2 start "npm run start" --name acbot-clone

# Save PM2 process list
pm2 save

echo "=== Deployment complete ==="
echo "App running at http://localhost:3000"
echo "Use 'pm2 logs acbot-clone' to view logs"
