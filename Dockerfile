# 使用 Node.js 18 作為基礎映像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 建置前端
RUN npm run build

# 創建資料庫目錄
RUN mkdir -p database

# 暴露端口
EXPOSE 3001

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3001

# 啟動整合式服務
CMD ["node", "server.cjs"] 