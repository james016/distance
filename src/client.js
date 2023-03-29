const socketUrl = 'wss://james016.com/socket';
let websocket = new WebSocket(socketUrl);

const recentPositions = [];

// 获取DOM元素
const userId = document.getElementById('userId');
const roomId = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const lastRefreshTime = document.getElementById('lastRefreshTime');
const distanceList = document.getElementById('distanceList');
const wsStatus = document.getElementById('wsStatus');

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
      updateDistanceList(data.userId, data.distance, data.accuracy, data.timestamp);
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
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = new Date(position.timestamp);

    if (websocket.readyState === WebSocket.CONNECTING) {
        websocket.addEventListener('open', () => {
        websocket.send(JSON.stringify({ type: 'joinRoom', roomId: room, position: { latitude, longitude, accuracy, timestamp } }));
        });
    } else if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'joinRoom', roomId: room, position: { latitude, longitude, accuracy, timestamp } }));
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

function reconnect() {
  websocket = new WebSocket(socketUrl);
  
  websocket.addEventListener('open', onOpen);
  websocket.addEventListener('message', onMessage);
  websocket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function refreshDistances() {
  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    console.log('Current position:', position);
    const now = new Date(position.timestamp);
    const timestamp = now;

    recentPositions.push({ latitude, longitude, accuracy, timestamp });

    // 保持最近 100 个位置
    if (recentPositions.length > 100) {
      recentPositions.shift();
    }
  
    const currentPos = { latitude, longitude, accuracy };
    recentPositions.slice(0, -1).forEach((prevPos, index) => {
      const nextPos = recentPositions[index + 1];
      const distanceDiff = calculateDistanceDiff(nextPos, prevPos);
      const timeDiff = (nextPos.timestamp.getTime() - prevPos.timestamp.getTime()) / 1000;
      const accuracyAll = Math.pow((Math.pow(prevPos.accuracy, 2) + Math.pow(nextPos.accuracy, 2)), 0.5);

      updateRecentPositionsList(index, distanceDiff, timeDiff, accuracyAll);
    });

    if (websocket.readyState === WebSocket.CONNECTING) {
      websocket.addEventListener('open', () => {
        websocket.send(JSON.stringify({ type: 'refreshDistances', position: { latitude, longitude, accuracy, timestamp } }));
      });
    } else if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'refreshDistances', position: { latitude, longitude, accuracy, timestamp } }));
    } else if (websocket.readyState === WebSocket.CLOSED) {
      console.log(websocket.readyState)
      reconnect();
      joinRoom();
    }
    else {
      console.error('WebSocket is not in the correct state to send a message.');
    }

    lastRefreshTime.textContent = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    wsStatus.textContent = websocket.readyState;
  });
}


function updateDistanceList(otherUserId, distance, accuracy, timestamp) {
  const existingItem = distanceList.querySelector(`[data-user-id="${otherUserId}"]`);
  const timestampDiff = (new Date(timestamp) - new Date()) / 1000;
  const content = `${(distance*1000).toFixed(1)} ± ${accuracy.toFixed(1)}米，时间差：${timestampDiff.toFixed(1)}秒`;

  if (existingItem) {
    existingItem.querySelector('.distance').textContent = content;
  } else {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-user-id', otherUserId);
    listItem.innerHTML = `用户 ${otherUserId}: <span class="distance">${content}</span>`;
    distanceList.appendChild(listItem);
  }
}

function deleteDistance(otherUserId) {
    const existingItem = distanceList.querySelector(`[data-user-id="${otherUserId}"]`);
    if (existingItem) {
        distanceList.removeChild(existingItem);
    }
}

function updateRecentPositionsList(index, distanceDiff, timeDiff, accuracy) {
  const recentPositionsList = document.getElementById('recentPositionsList');
  const existingItem = recentPositionsList.querySelector(`[data-index="${index}"]`);
  const distance = `${distanceDiff.toFixed(1)} ± ${accuracy.toFixed(1)}`
  
  if (existingItem) {
    existingItem.querySelector('.distance-diff').textContent = distance;
    existingItem.querySelector('.time-diff').textContent = timeDiff.toFixed(1);
  } else {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-index', index);
    listItem.innerHTML = `${index}. 距离差: <span class="distance-diff">${distance}</span>米, 时间差: <span class="time-diff">${timeDiff.toFixed(1)}</span>秒`;
    recentPositionsList.insertBefore(listItem, recentPositionsList.firstChild);
  }
}
  
// 计算两个地理坐标之间的距离
function calculateDistanceDiff(pos1, pos2) {
  const R = 6371; // 地球半径，单位：公里
  const lat1 = pos1.latitude * (Math.PI / 180);
  const lat2 = pos2.latitude * (Math.PI / 180);
  const dLat = (pos2.latitude - pos1.latitude) * (Math.PI / 180);
  const dLon = (pos2.longitude - pos1.longitude) * (Math.PI / 180);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  return d * 1000; // 转换为米
}
