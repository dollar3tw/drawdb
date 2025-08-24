# ========== 第一階段：構建前端 ==========
FROM node:20-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴（包括開發依賴）
RUN npm ci

# 複製前端源代碼
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public

# 構建前端
RUN npm run build

# ========== 第二階段：生產環境 ==========
FROM node:20-alpine AS production

# 安裝 dumb-init 和 sqlite3
RUN apk add --no-cache dumb-init sqlite

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 設置工作目錄
WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 只安裝生產依賴，清理緩存
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# 從構建階段複製構建好的前端文件
COPY --from=builder /app/dist ./dist

# 複製後端必要文件
COPY server.cjs ./
COPY routes ./routes
COPY middleware ./middleware
COPY database/database.cjs ./database/database.cjs
COPY database/migrate.cjs ./database/migrate.cjs
COPY database/migrations ./database/migrations

# 創建資料目錄並設置權限
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app && \
    chmod 755 /app/data

# 切換到非 root 用戶
USER nodejs

# 設置資料庫路徑到 data 目錄
ENV DATABASE_PATH=/app/data/mitdb.sqlite

# 暴露端口
EXPOSE 3001

# 設置生產環境變數
ENV NODE_ENV=production \
    PORT=3001 \
    JWT_SECRET=${JWT_SECRET:-mitdb-default-jwt-secret-2024} \
    SESSION_SECRET=${SESSION_SECRET:-your-session-secret} \
    ADMIN_DEFAULT_PASSWORD=${ADMIN_DEFAULT_PASSWORD:-admin}

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1);})" || exit 1

# 使用 dumb-init 處理信號
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.cjs"] 