# 使用 Node.js 官方映像
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 檔案
COPY package*.json ./
COPY backend/package*.json ./backend/

# 安裝前端依賴
RUN npm install

# 安裝後端依賴
RUN cd backend && npm install

# 複製所有原始碼
COPY . .

# 建置前端
RUN npm run build

# 暴露埠號
EXPOSE 3001

# 設定工作目錄到後端
WORKDIR /app/backend

# 啟動後端服務 (會同時提供前端靜態檔案)
CMD ["npm", "start"]