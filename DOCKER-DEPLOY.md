# DrawDB Docker 部署指南

## 快速開始

### 1. 使用 Docker Compose（推薦）

```bash
# 克隆專案
git clone https://github.com/your-repo/drawdb.git
cd drawdb

# 使用環境變數檔案（可選）
cp .env.example .env
# 編輯 .env 設定你的環境變數

# 構建並啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 停止並刪除資料
docker-compose down -v
```

### 2. 使用純 Docker

```bash
# 構建映像
docker build -t drawdb:latest .

# 運行容器
docker run -d \
  --name drawdb \
  -p 3001:3001 \
  -v drawdb-data:/app/data \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -e SESSION_SECRET="your-secure-session-secret" \
  -e ADMIN_DEFAULT_PASSWORD="your-admin-password" \
  --restart unless-stopped \
  drawdb:latest

# 查看日誌
docker logs -f drawdb

# 停止容器
docker stop drawdb

# 刪除容器
docker rm drawdb
```

## 環境變數配置

創建 `.env` 檔案來配置環境變數：

```bash
# 複製範例檔案
cp .env.example .env

# 編輯設定
nano .env  # 或使用你喜歡的編輯器
```

### 重要設定項目

```env
# === Docker 部署配置 ===
# 資料持久化目錄（重要：設定你要存放資料的路徑）
DATA_PATH=/opt/drawdb/data        # Linux 生產環境
# DATA_PATH=./data                 # 開發環境（相對路徑）
# DATA_PATH=C:/drawdb/data        # Windows
# DATA_PATH=/Users/你/drawdb/data  # macOS

# === 基本配置 ===
NODE_ENV=production
PORT=3001

# === 安全密鑰（請務必修改為安全的隨機字串）===
JWT_SECRET=your-very-secure-jwt-secret-here-$(openssl rand -hex 32)
SESSION_SECRET=your-very-secure-session-secret-here-$(openssl rand -hex 32)

# === 預設管理員密碼（首次登入後請立即修改）===
ADMIN_DEFAULT_PASSWORD=SecureAdminPassword123!

# === SSO 配置（選填，如果使用 Synology SSO）===
SSO_ISSUER=https://sso.your-domain.com
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_REDIRECT_URI=https://drawdb.your-domain.com/sso/callback
STATE_SECRET=your-state-secret
SSO_SCOPE=openid profile email
```

### 創建資料目錄

根據你在 `DATA_PATH` 設定的路徑創建目錄：

```bash
# 如果使用 /opt/drawdb/data
sudo mkdir -p /opt/drawdb/data
sudo chown -R 1001:1001 /opt/drawdb/data  # 1001 是容器內 nodejs 用戶的 UID
sudo chmod 755 /opt/drawdb/data

# 如果使用相對路徑 ./data
mkdir -p ./data
chmod 755 ./data
```

## 映像優化說明

### 多階段構建
- **第一階段**：使用完整 Node.js 環境構建前端
- **第二階段**：只包含運行時必要檔案，大幅減少映像大小

### 安全性措施
- 使用非 root 用戶運行應用
- 使用 Alpine Linux 減少攻擊面
- 包含健康檢查確保服務穩定
- 使用 dumb-init 正確處理進程信號

### 映像大小優化
- 使用 Alpine Linux（輕量級）
- 多階段構建分離構建和運行環境
- 只安裝生產依賴
- 清理 npm 緩存和臨時檔案

預計映像大小：約 200-250MB

## 部署到生產環境

### 1. 構建生產映像

```bash
# 使用特定標籤構建
docker build -t drawdb:v1.0.0 .

# 標記為 latest
docker tag drawdb:v1.0.0 drawdb:latest
```

### 2. 推送到 Docker Registry

```bash
# Docker Hub
docker tag drawdb:v1.0.0 yourusername/drawdb:v1.0.0
docker push yourusername/drawdb:v1.0.0

# 私有 Registry
docker tag drawdb:v1.0.0 registry.your-domain.com/drawdb:v1.0.0
docker push registry.your-domain.com/drawdb:v1.0.0
```

### 3. 在遠端伺服器部署

```bash
# 拉取映像
docker pull yourusername/drawdb:v1.0.0

# 運行容器
docker run -d \
  --name drawdb \
  -p 3001:3001 \
  -v /path/to/data:/app/data \
  --env-file /path/to/.env \
  --restart always \
  yourusername/drawdb:v1.0.0
```

## 反向代理配置

### Nginx 配置範例

```nginx
server {
    listen 80;
    server_name drawdb.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drawdb.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik 配置範例

```yaml
# docker-compose.yml 加入 labels
services:
  drawdb:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.drawdb.rule=Host(`drawdb.your-domain.com`)"
      - "traefik.http.routers.drawdb.entrypoints=websecure"
      - "traefik.http.routers.drawdb.tls.certresolver=letsencrypt"
      - "traefik.http.services.drawdb.loadbalancer.server.port=3001"
```

## 資料備份與還原

### 備份資料庫

```bash
# 使用 Docker 卷備份
docker run --rm \
  -v drawdb-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/drawdb-backup-$(date +%Y%m%d).tar.gz -C /data .

# 或直接從容器複製
docker cp drawdb:/app/data/drawdb.sqlite ./drawdb-backup-$(date +%Y%m%d).sqlite
```

### 還原資料庫

```bash
# 從備份還原
docker run --rm \
  -v drawdb-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/drawdb-backup-20240101.tar.gz -C /data

# 或直接複製到容器
docker cp ./drawdb-backup.sqlite drawdb:/app/data/drawdb.sqlite
docker restart drawdb
```

## 監控與維護

### 查看容器狀態

```bash
# 容器狀態
docker ps -a | grep drawdb

# 資源使用
docker stats drawdb

# 健康檢查狀態
docker inspect drawdb --format='{{.State.Health.Status}}'
```

### 日誌管理

```bash
# 查看最近日誌
docker logs --tail 100 drawdb

# 持續監控日誌
docker logs -f drawdb

# 導出日誌
docker logs drawdb > drawdb.log 2>&1
```

### 更新應用

```bash
# 拉取新版本
docker pull yourusername/drawdb:latest

# 停止舊容器
docker stop drawdb
docker rm drawdb

# 啟動新容器
docker run -d \
  --name drawdb \
  -p 3001:3001 \
  -v drawdb-data:/app/data \
  --env-file .env \
  --restart always \
  yourusername/drawdb:latest
```

## 故障排除

### 常見問題

1. **容器無法啟動**
   ```bash
   # 檢查日誌
   docker logs drawdb
   
   # 檢查環境變數
   docker exec drawdb env
   ```

2. **資料庫權限問題**
   ```bash
   # 修復權限
   docker exec -u root drawdb chown -R nodejs:nodejs /app/data
   ```

3. **健康檢查失敗**
   ```bash
   # 手動測試健康檢查
   docker exec drawdb wget -O- http://localhost:3001/health
   ```

4. **記憶體不足**
   ```bash
   # 限制記憶體使用
   docker run -d \
     --memory="1g" \
     --memory-swap="2g" \
     drawdb:latest
   ```

## 安全建議

1. **必須修改預設密碼和密鑰**
   - JWT_SECRET
   - SESSION_SECRET
   - ADMIN_DEFAULT_PASSWORD

2. **使用 HTTPS**
   - 配置反向代理使用 SSL
   - 使用 Let's Encrypt 免費證書

3. **定期更新**
   - 定期更新 Docker 映像
   - 監控安全公告

4. **資料備份**
   - 定期自動備份資料庫
   - 測試還原流程

5. **網路隔離**
   - 使用 Docker 網路隔離服務
   - 只暴露必要的端口

## 效能調優

### Docker 配置

```yaml
# docker-compose.yml
services:
  drawdb:
    # 資源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    
    # 日誌配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 系統調優

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 調整內核參數
sysctl -w net.core.somaxconn=1024
sysctl -w net.ipv4.tcp_max_syn_backlog=1024
```

## 支援與幫助

- 查看應用日誌：`docker logs drawdb`
- 進入容器調試：`docker exec -it drawdb sh`
- 檢查健康狀態：`curl http://localhost:3001/health`

如有問題，請提供：
1. Docker 版本：`docker --version`
2. 容器日誌：`docker logs drawdb`
3. 環境配置（隱藏敏感資訊）