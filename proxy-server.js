const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');

const proxy = httpProxy.createProxyServer();

const https = require('https');

const options = {
	  key: fs.readFileSync('/etc/letsencrypt/live/james016.com/privkey.pem'),
	  cert: fs.readFileSync('/etc/letsencrypt/live/james016.com/fullchain.pem')
};


// 添加错误处理程序
proxy.on('error', (err, req, socketOrRes) => {
    console.error(`Error occurred while proxying request: ${err.message}`);
    if (socketOrRes.writeHead) {
      socketOrRes.writeHead(502, { 'Content-Type': 'text/plain' });
      socketOrRes.end('An error occurred while proxying the request.');
    } else {
      socketOrRes.destroy();
    }
  });
  

const server = https.createServer(options, (req, res) => {
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
server.on('upgrade', (req, socket, head) => {
  const url = req.url;

  if (url.startsWith('/socket')) {
    // 将WebSocket请求代理到 localhost:10002
    proxy.ws(req, socket, head, { target: 'ws://localhost:10002' });
  } else {
    // 将WebSocket请求代理到 localhost:10001
    proxy.ws(req, socket, head, { target: 'ws://localhost:10001' });
  }
});

const port = 443;

server.listen(port, () => {
  console.log('Proxy server is running on http://localhost:' + port);
});
