class TrackingWebSocket extends WebSocket {
    constructor(url) {
      super(url);
      this.listeners = {};
    }
  
    addEventListener(type, listener) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
      super.addEventListener(type, listener);
    }
  
    removeEventListener(type, listener) {
      if (this.listeners[type]) {
        const index = this.listeners[type].indexOf(listener);
        if (index !== -1) {
          this.listeners[type].splice(index, 1);
        }
      }
      super.removeEventListener(type, listener);
    }

    dispatchEvent(event) {
        if (this.listeners[event.type]) {
          this.listeners[event.type].forEach(listener => listener.call(this, event));
        }
        return super.dispatchEvent(event);
      }
  
    getListeners(type) {
      return this.listeners[type] || [];
    }
  }
  

// 请根据实际情况替换以下websocket地址
const websocket = new TrackingWebSocket('wss://james016.com/socket');
// const websocket = new TrackingWebSocket('wss://diffusion-webui.iap.hh-d.brainpp.cn/');

// 获取DOM元素
const userId = document.getElementById('userId');
const roomId = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const lastRefreshTime = document.getElementById('lastRefreshTime');
const distanceList = document.getElementById('distanceList');

// 初始化
console.log('Connecting to server...');

// 事件监听
joinBtn.addEventListener('click', joinRoom);
leaveBtn.addEventListener('click', leaveRoom);
refreshBtn.addEventListener('click', refreshDistances);

// 让 refreshDistances 每隔 2 秒执行一次
setInterval(refreshDistances, 2000);

// WebSocket事件处理
websocket.addEventListener('open', onOpen);
websocket.addEventListener('message', onMessage);
websocket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

// 省略具体的事件处理和测距功能实现代码...
function onOpen() {
    console.log('Connected to server');
  }
  
function onMessage(event) {
  const data = JSON.parse(event.data);
  console.log('Received data from server:', data);

  switch (data.type) {
    case 'userId':
      userId.textContent = data.userId;
      break;
    case 'distance':
      updateDistanceList(data.userId, data.distance);
      break;
    case 'leaveRoom':
      deleteDistance(data.userId);
    default:
      break;
  }
}
  
function joinRoom() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  const room = roomId.value.trim();
  if (!room) {
    alert('请输入房间ID');
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;

    if (websocket.readyState === WebSocket.CONNECTING) {
        websocket.addEventListener('open', () => {
        websocket.send(JSON.stringify({ type: 'joinRoom', roomId: room, position: { latitude, longitude } }));
        });
    } else if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'joinRoom', roomId: room, position: { latitude, longitude } }));
    } else {
        console.error('WebSocket is not in the correct state to send a message.');
    }

    joinBtn.disabled = true;
    leaveBtn.disabled = false;
    refreshBtn.disabled = false;
    });
}
  
  
function leaveRoom() {
  if (websocket.readyState === WebSocket.CONNECTING) {
      websocket.addEventListener('open', () => {
        websocket.send(JSON.stringify({ type: 'leaveRoom' }));
      });
    } else if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'leaveRoom' }));
    } else {
      console.error('WebSocket is not in the correct state to send a message.');
    }
  
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
    refreshBtn.disabled = true;

  distanceList.innerHTML = '';
}
  
function refreshDistances() {
  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;

    if (websocket.readyState === WebSocket.CONNECTING) {
      websocket.addEventListener('open', () => {
        websocket.send(JSON.stringify({ type: 'refreshDistances', position: { latitude, longitude } }));
      });
    } else if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'refreshDistances', position: { latitude, longitude } }));
    } else {
      console.error('WebSocket is not in the correct state to send a message.');
    }

    const now = new Date();
    lastRefreshTime.textContent = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  });
}


function updateDistanceList(otherUserId, distance) {
  const existingItem = distanceList.querySelector(`[data-user-id="${otherUserId}"]`);

  if (existingItem) {
    existingItem.querySelector('.distance').textContent = (distance*1000).toFixed(1);
  } else {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-user-id', otherUserId);
    listItem.innerHTML = `用户 ${otherUserId}: <span class="distance">${(distance*1000).toFixed(1)}</span>米`;
    distanceList.appendChild(listItem);
  }
}

function deleteDistance(otherUserId) {
    const existingItem = distanceList.querySelector(`[data-user-id="${otherUserId}"]`);
    if (existingItem) {
        distanceList.removeChild(existingItem);
    }
}
