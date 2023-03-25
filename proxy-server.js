const http = require('http');
const httpProxy = require('http-proxy');
const https = require('https');
const fs = require('fs');

const proxy = httpProxy.createProxyServer();

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('An internal error occurred. Please try again later.');
});


const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/james016.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/james016.com/fullchain.pem'),
};

const httpServer = http.createServer((req, res) => {
  const host = req.headers.host;
  res.writeHead(301, { Location: `https://${host}${req.url}` });
  res.end();
});

const httpsServer = https.createServer(options, (req, res) => {
  const url = req.url;

  if (url.startsWith('/socket')) {
    // 将请求代理到 localhost:10002
    proxy.web(req, res, { target: 'http://localhost:10002' });
  } else {
    // 将请求代理到 localhost:10001
    proxy.web(req, res, { target: 'http://localhost:10001' });
  }
});

// 代理WebSocket连接
httpsServer.on('upgrade', (req, socket, head) => {
  const url = req.url;

  if (url.startsWith('/socket')) {
    // 将WebSocket请求代理到 localhost:10002
    proxy.ws(req, socket, head, { target: 'ws://localhost:10002' });
  } else {
    // 将WebSocket请求代理到 localhost:10001
    proxy.ws(req, socket, head, { target: 'ws://localhost:10001' });
  }
});

const httpPort = 80;
const httpsPort = 443;

httpServer.listen(httpPort, () => {
  console.log(`HTTP server is running on port ${httpPort}`);
});

httpsServer.listen(httpsPort, () => {
  console.log(`HTTPS server is running on port ${httpsPort}`);
});

