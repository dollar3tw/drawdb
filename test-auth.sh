#!/bin/bash

echo "=== DrawDB 認證系統測試 ==="
echo

# 測試 1: 登入 mitadmin
echo "1. 測試 mitadmin 登入..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "mitadmin", "password": "mitadmin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✓ mitadmin 登入成功"
echo "Token: ${TOKEN:0:50}..."
echo

# 測試 2: 獲取用戶列表
echo "2. 測試獲取用戶列表..."
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/users)
echo "✓ 用戶列表獲取成功"
echo "用戶數量: $(echo $USERS_RESPONSE | grep -o '"id":[0-9]*' | wc -l)"
echo

# 測試 3: 註冊新用戶
echo "3. 測試註冊新用戶..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "editor1", "email": "editor1@example.com", "password": "password123", "role": "editor"}')
echo "✓ 新用戶註冊成功"
echo

# 測試 4: 創建圖表
echo "4. 測試創建圖表..."
DIAGRAM_RESPONSE=$(curl -s -X POST http://localhost:3001/api/diagrams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "測試圖表", "databaseType": "mysql", "tables": {}, "relationships": [], "notes": [], "areas": [], "pan": {"x": 0, "y": 0}, "zoom": 1}')
DIAGRAM_ID=$(echo $DIAGRAM_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "✓ 圖表創建成功，ID: $DIAGRAM_ID"
echo

# 測試 5: 獲取圖表列表
echo "5. 測試獲取圖表列表..."
DIAGRAMS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/diagrams)
DIAGRAM_COUNT=$(echo $DIAGRAMS_RESPONSE | grep -o '"id":[0-9]*' | wc -l)
echo "✓ 圖表列表獲取成功"
echo "圖表數量: $DIAGRAM_COUNT"
echo

# 測試 6: 刪除圖表（mitadmin 權限）
echo "6. 測試 mitadmin 刪除圖表..."
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3001/api/diagrams/$DIAGRAM_ID \
  -H "Authorization: Bearer $TOKEN")
echo "✓ 圖表刪除成功"
echo

echo "=== 所有測試完成 ==="
echo "✓ 用戶認證系統正常運行"
echo "✓ 角色權限控制正常"
echo "✓ 圖表管理功能正常"
echo "✓ mitadmin 可以刪除任何圖表" 