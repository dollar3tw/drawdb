const express = require('express');
const router = express.Router();
const openidClient = require('openid-client');
const { 
  discovery,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  randomNonce,
  randomState,
  fetchUserInfo,
  customFetch,
  WWWAuthenticateChallengeError,
  ResponseBodyError
} = openidClient;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../database/database.cjs');

// 用於加密狀態的密鑰
const STATE_SECRET = process.env.STATE_SECRET || 'state-encryption-secret-key';

// 如果使用自簽名證書，忽略 SSL 驗證（僅開發環境）
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// SSO 配置
const SSO_CONFIG = {
  issuer: 'https://sso.mi-tech.com.tw',
  client_id: '36f8f572185af7c037e2045afd100f27',
  client_secret: 'SaiBDPWnoPHueoy7QcrHkgHwtfUXmLPX',
  redirect_uri: 'http://dd2.mi-tech.com.tw/sso/callback',  // 目前只支援 http
  scope: 'openid profile email'
};

console.log('SSO Configuration loaded:', {
  issuer: SSO_CONFIG.issuer,
  client_id: SSO_CONFIG.client_id,
  redirect_uri: SSO_CONFIG.redirect_uri,
  scope: SSO_CONFIG.scope
});

// 儲存 OIDC 配置
let oidcConfig = null;

// 初始化 OIDC 配置
async function initializeOidcConfig() {
  try {
    console.log('Attempting to discover OIDC issuer at:', SSO_CONFIG.issuer);
    const wellKnownUrl = `${SSO_CONFIG.issuer}/webman/sso/.well-known/openid-configuration`;
    console.log('Well-known URL:', wellKnownUrl);
    
    // 使用新的 discovery API，但暫時不傳入 client credentials
    oidcConfig = await discovery(new URL(wellKnownUrl), SSO_CONFIG.client_id);
    
    console.log('OIDC Config initialized successfully');
    console.log('Authorization endpoint:', oidcConfig.serverMetadata().authorization_endpoint);
    console.log('Token endpoint:', oidcConfig.serverMetadata().token_endpoint);
  } catch (error) {
    console.error('Failed to initialize OIDC config:', error);
    console.error('Error details:', error.message);
  }
}

// 初始化配置
initializeOidcConfig();

// 清理 session（用於測試）
router.get('/clear', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('無法清理 session');
    }
    res.send('Session 已清理，請重新嘗試登入');
  });
});

// SSO 登入路由
router.get('/login', async (req, res) => {
  try {
    // 清理任何現有的 session 資料
    if (req.session && req.session.oidc) {
      delete req.session.oidc;
    }
    
    if (!oidcConfig) {
      await initializeOidcConfig();
      if (!oidcConfig) {
        return res.status(500).json({ error: 'SSO 服務暫時不可用' });
      }
    }

    // 生成隨機的 nonce
    const nonce = randomNonce();
    
    // 創建一個包含 nonce 的加密狀態
    const stateData = {
      nonce: nonce,
      timestamp: Date.now(),
      origin: req.headers.origin || 'http://localhost:3001'
    };
    
    // 加密狀態數據
    const encryptedState = jwt.sign(stateData, STATE_SECRET, { expiresIn: '10m' });
    
    console.log('Generated state data:', stateData);
    console.log('Encrypted state:', encryptedState);
    
    // 構建授權 URL
    const parameters = new URLSearchParams();
    parameters.set('client_id', SSO_CONFIG.client_id);
    parameters.set('redirect_uri', SSO_CONFIG.redirect_uri);
    parameters.set('response_type', 'code');
    parameters.set('scope', SSO_CONFIG.scope);
    parameters.set('state', encryptedState);
    parameters.set('nonce', nonce);
    // 添加時間戳防止緩存
    parameters.set('ts', Date.now().toString());
    
    const authorizationUrl = `${oidcConfig.serverMetadata().authorization_endpoint}?${parameters}`;
    
    console.log('Redirecting to:', authorizationUrl);
    
    // 設置 no-cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // 重定向到 SSO 登入頁面
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error('SSO login error:', error);
    res.status(500).json({ error: '無法初始化 SSO 登入' });
  }
});

// SSO 回調路由
router.get('/callback', async (req, res) => {
  try {
    if (!oidcConfig) {
      return res.status(500).send('SSO 服務不可用');
    }
    
    console.log('Callback received with params:', req.query);
    console.log('Callback protocol:', req.protocol);
    console.log('Callback host:', req.get('host'));
    
    // 檢查協議是否匹配
    if (req.protocol === 'https' && SSO_CONFIG.redirect_uri.startsWith('http://')) {
      console.error('Protocol mismatch: callback is https but redirect_uri is http');
      return res.status(400).send(`
        <h1>協議不匹配</h1>
        <p>請使用 <a href="http://dd2.mi-tech.com.tw">http://dd2.mi-tech.com.tw</a> 訪問網站</p>
        <p>或在 Synology SSO Server 中添加 https://dd2.mi-tech.com.tw/sso/callback 作為重新導向 URI</p>
      `);
    }
    
    // 從 state 參數解密獲取 nonce
    const encryptedState = req.query.state;
    if (!encryptedState) {
      return res.status(400).send('缺少 state 參數');
    }
    
    let stateData;
    try {
      stateData = jwt.verify(encryptedState, STATE_SECRET);
      console.log('Decrypted state data:', stateData);
    } catch (error) {
      console.error('State verification failed:', error);
      return res.status(400).send('State 驗證失敗');
    }
    
    // 檢查時間戳避免重放攻擊
    if (Date.now() - stateData.timestamp > 600000) { // 10 分鐘
      return res.status(400).send('State 已過期');
    }
    
    // 構建完整的回調 URL
    const fullUrl = `${SSO_CONFIG.redirect_uri}?${req.url.split('?')[1]}`;
    const currentUrl = new URL(fullUrl);
    
    // 交換授權碼獲取 token
    console.log('Exchanging code for token...');
    console.log('Code:', req.query.code);
    console.log('Expected nonce:', stateData.nonce);
    console.log('Redirect URI:', SSO_CONFIG.redirect_uri);
    console.log('Redirect URI (encoded):', encodeURIComponent(SSO_CONFIG.redirect_uri));
    console.log('Full callback URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    
    let response;
    try {
      console.log('Token endpoint:', oidcConfig.serverMetadata().token_endpoint);
      console.log('Client ID:', SSO_CONFIG.client_id);
      
      // 先嘗試 client_secret_post 方法（Synology SSO 的預設方法）
      console.log('Using client_secret_post authentication method...');
      
      const postAuthParams = new URLSearchParams();
      postAuthParams.set('client_id', SSO_CONFIG.client_id);
      postAuthParams.set('client_secret', SSO_CONFIG.client_secret);
      postAuthParams.set('grant_type', 'authorization_code');
      postAuthParams.set('code', req.query.code);
      postAuthParams.set('redirect_uri', SSO_CONFIG.redirect_uri);
      
      console.log('Request parameters:', {
        client_id: SSO_CONFIG.client_id,
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: SSO_CONFIG.redirect_uri
      });
      
      // 調試：檢查實際的請求內容
      console.log('Full request body:', postAuthParams.toString());
      console.log('Redirect URI (raw):', SSO_CONFIG.redirect_uri);
      console.log('Redirect URI (encoded in body):', encodeURIComponent(SSO_CONFIG.redirect_uri));
      
      let postAuthResponse = await fetch(oidcConfig.serverMetadata().token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'DrawDB-SSO-Client/1.0'
        },
        body: postAuthParams.toString()
      });
      
      console.log('Token response status:', postAuthResponse.status);
      
      if (!postAuthResponse.ok) {
        const errorBody = await postAuthResponse.text();
        console.error('Token exchange failed:', errorBody);
        
        // 嘗試解析 JSON 錯誤
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch (e) {
          errorData = { error: errorBody };
        }
        
        // 提供 curl 命令供調試
        console.log('\n=== 調試信息 ===');
        console.log('Token endpoint:', oidcConfig.serverMetadata().token_endpoint);
        console.log('Client ID:', SSO_CONFIG.client_id);
        console.log('Redirect URI:', SSO_CONFIG.redirect_uri);
        console.log('Authorization code:', req.query.code);
        console.log('\n請在終端嘗試以下 curl 命令來手動測試 token 交換：\n');
        const basicAuth = Buffer.from(`${SSO_CONFIG.client_id}:${SSO_CONFIG.client_secret}`).toString('base64');
        console.log(`curl -X POST "${oidcConfig.serverMetadata().token_endpoint}" \\`);
        console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
        console.log(`  -H "Accept: application/json" \\`);
        console.log(`  -H "Authorization: Basic ${basicAuth}" \\`);
        console.log(`  -d "grant_type=authorization_code" \\`);
        console.log(`  -d "code=${req.query.code}" \\`);
        console.log(`  -d "redirect_uri=${SSO_CONFIG.redirect_uri}"`);
        console.log('\n或者使用 client_secret_post 方法：\n');
        console.log(`curl -X POST "${oidcConfig.serverMetadata().token_endpoint}" \\`);
        console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
        console.log(`  -H "Accept: application/json" \\`);
        console.log(`  -d "client_id=${SSO_CONFIG.client_id}" \\`);
        console.log(`  -d "client_secret=${SSO_CONFIG.client_secret}" \\`);
        console.log(`  -d "grant_type=authorization_code" \\`);
        console.log(`  -d "code=${req.query.code}" \\`);
        console.log(`  -d "redirect_uri=${SSO_CONFIG.redirect_uri}"`);
        console.log('\n=================\n');
        
        // 根據錯誤類型提供更友好的錯誤訊息
        if (errorData.error === 'server_error') {
          throw new Error('SSO 伺服器內部錯誤。請檢查 Synology SSO Server 的日誌。');
        } else if (errorData.error === 'invalid_grant') {
          throw new Error('授權碼無效或已過期。請重新嘗試登入。');
        } else if (errorData.error === 'invalid_client') {
          throw new Error('客戶端認證失敗。請檢查 client_id 和 client_secret。');
        } else {
          throw new Error(`Token exchange failed: ${errorBody}`);
        }
      }
      
      response = await postAuthResponse.json();
      console.log('Token data received:', Object.keys(response));
      
      console.log('Token exchange successful');
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      console.error('Error message:', tokenError.message);
      
      // 檢查是否有 WWWAuthenticateChallengeError
      if (tokenError instanceof openidClient.WWWAuthenticateChallengeError) {
        console.error('WWW-Authenticate challenge:', tokenError.challenge);
      }
      
      // 檢查是否有 ResponseBodyError
      if (tokenError instanceof openidClient.ResponseBodyError) {
        console.error('Response body error:', tokenError.body);
        console.error('Response status:', tokenError.status);
      }
      
      if (tokenError.cause) {
        console.error('Error cause:', tokenError.cause);
        if (tokenError.cause.body) {
          console.error('Error cause body:', tokenError.cause.body);
        }
      }
      
      throw tokenError;
    }
    
    const { access_token, id_token } = response;
    
    // 獲取使用者資訊
    console.log('Fetching user info with access token...');
    
    // 手動獲取使用者資訊
    const userinfoResponse = await fetch(oidcConfig.serverMetadata().userinfo_endpoint, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    if (!userinfoResponse.ok) {
      const errorBody = await userinfoResponse.text();
      console.error('Userinfo endpoint error:', errorBody);
      throw new Error(`Userinfo endpoint returned ${userinfoResponse.status}: ${errorBody}`);
    }
    
    const userinfo = await userinfoResponse.json();
    console.log('User info from SSO:', JSON.stringify(userinfo, null, 2));
    
    // 確保有必要的用戶信息
    if (!userinfo.sub && !userinfo.username) {
      console.error('Missing user identifier in userinfo:', userinfo);
      return res.status(500).send('無法從 SSO 獲取用戶識別信息');
    }
    
    // 構建用戶資料
    const email = userinfo.email || `${userinfo.username || userinfo.sub}@sso.local`;
    const username = userinfo.username || userinfo.sub || email.split('@')[0];
    const displayName = userinfo.name || username;
    
    console.log('Processed user data:', { email, username, displayName });
    
    // 在資料庫中查找或創建使用者
    try {
      // 檢查使用者是否已存在
      let existingUser = await db.getUserByEmail(email);
      let userId;
      
      if (existingUser) {
        // 使用者已存在，更新最後登入時間
        userId = existingUser.id;
        await db.updateUser(userId, { lastLogin: new Date().toISOString() });
      } else {
        // 創建新使用者
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10); // 隨機密碼
        
        const newUser = await db.createUser({
          username: username,
          email: email,
          password: hashedPassword,
          display_name: displayName,
          auth_source: 'SSO',
          sso_id: userinfo.sub
        });
        
        userId = newUser.id;
      }
      
      // 獲取完整的使用者資訊（包含角色）
      const fullUser = existingUser || await db.getUserById(userId);
      
      // 創建 JWT token
      const token = jwt.sign(
        { 
          userId: userId,
          username: fullUser.username,
          email: email,
          role: fullUser.role || 'user'
        },
        process.env.JWT_SECRET || 'drawdb-mit-secret-key-2024',
        { expiresIn: '7d' }
      );
      
      // 創建會話記錄
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      await db.createSession(userId || existingUser.id, sessionToken, expiresAt);
      
      // 重定向回前端並附帶 token
      const redirectUrl = `${stateData.origin}/?token=${token}&email=${email}&name=${encodeURIComponent(displayName || '')}`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).send('資料庫操作失敗');
    }
    
  } catch (error) {
    console.error('SSO callback error:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    
    // 返回一個友好的錯誤頁面，包含重新登入的連結
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SSO 認證失敗</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .error-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          h1 {
            color: #e74c3c;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          .btn {
            display: inline-block;
            padding: 12px 30px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 0 10px;
          }
          .btn:hover {
            background-color: #2980b9;
          }
          .error-details {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f8f8;
            border-radius: 5px;
            font-size: 14px;
            text-align: left;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>SSO 認證失敗</h1>
          <p>很抱歉，我們無法完成您的登入請求。這可能是暫時性的問題。</p>
          <a href="/sso/login?retry=1" class="btn">重新嘗試登入</a>
          <a href="/" class="btn" style="background-color: #95a5a6;">返回首頁</a>
          <div class="error-details">
            <strong>錯誤詳情：</strong><br>
            ${error.message}
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;