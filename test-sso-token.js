const https = require('https');

// 忽略 SSL 證書驗證（僅測試用）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SSO_CONFIG = {
  client_id: '36f8f572185af7c037e2045afd100f27',
  client_secret: 'SaiBDPWnoPHue6y7QcrHkaHwtfUXmLeX',
  redirect_uri: 'http://dd2.mi-tech.com.tw/sso/callback'
};

// 從命令行獲取授權碼
const code = process.argv[2];

if (!code) {
  console.log('使用方法: node test-sso-token.js <authorization_code>');
  process.exit(1);
}

console.log('測試 token exchange...');
console.log('Code:', code);

const params = new URLSearchParams({
  client_id: SSO_CONFIG.client_id,
  client_secret: SSO_CONFIG.client_secret,
  grant_type: 'authorization_code',
  code: code,
  redirect_uri: SSO_CONFIG.redirect_uri
});

const options = {
  hostname: 'sso.mi-tech.com.tw',
  path: '/webman/sso/SSOAccessToken.cgi',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(params.toString()),
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(params.toString());
req.end();