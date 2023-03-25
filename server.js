const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// 数据结构
const users = new Map();
const rooms = new Map();

wss.on('connection', (ws) => {
  // 生成用户ID
  const userId = generateUserId();
  users.set(userId, { ws, roomId: null });
  console.log(`User ${userId} connected`);
  ws.send(JSON.stringify({ type: 'userId', userId }));
  console.log(`reply: User ${userId} connected`);

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'joinRoom':
        joinRoom(userId, data.roomId, data.position);
        break;
      case 'leaveRoom':
        leaveRoom(userId);
        break;
      case 'refreshDistances':
        refreshDistances(userId, data.position);
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    leaveRoom(userId);
    users.delete(userId);
  });
});

// 服务器相关功能函数，如generateUserId、joinRoom、leaveRoom、refreshDistances等
// ...
function generateUserId() {
    let userId;
    do {
      userId = `user${Math.floor(Math.random() * 10000)}`;
    } while (users.has(userId));
    return userId;
  }
  
function joinRoom(userId, roomId, position) {
    const user = users.get(userId);
    if (user.roomId) {
      leaveRoom(userId);
    }
    user.roomId = roomId;
    user.position = position;
  
    let room = rooms.get(roomId);
    if (!room) {
      room = new Set();
      rooms.set(roomId, room);
    }
    room.add(userId);
  }

  function leaveRoom(userId) {
    const user = users.get(userId);
    if (!user.roomId) return;
  
    const room = rooms.get(user.roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        rooms.delete(user.roomId);
      }
    }
    user.roomId = null;

    // 通知房间内的其他用户
    room.forEach((otherUserId) => {
        if (otherUserId === userId) return;
    
        const otherUser = users.get(otherUserId);
        otherUser.ws.send(JSON.stringify({ type: 'leaveRoom', userId }));
        });
  }

  function refreshDistances(userId, position) {
    const user = users.get(userId);
    if (!user.roomId) return;
  
    const room = rooms.get(user.roomId);
    if (!room) return;
  
    // console.log(`User ${userId} refresh distances, position: ${position.latitude}, ${position.longitude}`);
  
    // 更新用户的位置
    user.position = position;

    // log all users in the room position
    // console.log(
    //     `position of all users in room ${user.roomId}: ${Array.from(room)
    //       .map(
    //         (userId) =>
    //           users.get(userId).position.latitude +
    //           "," +
    //           users.get(userId).position.longitude
    //       )
    //       .join("; ")}`
    //   );


  
    // 计算距离并发送给房间内的所有用户
    room.forEach((otherUserId) => {
      if (otherUserId === userId) return;
  
      const otherUser = users.get(otherUserId);
      const {distance, accuracy} = calculateDistance(position, otherUser.position);
  
      user.ws.send(JSON.stringify({ type: 'distance', distance, userId: otherUserId, accuracy }));
      otherUser.ws.send(JSON.stringify({ type: 'distance', distance, userId, accuracy }));
    });
  }
  

  function calculateDistance(position1, position2) {
    // 使用haversine公式计算地球上两点之间的距离
    const R = 6371; // 地球半径（千米）
  
    const lat1 = position1.latitude * (Math.PI / 180);
    const lat2 = position2.latitude * (Math.PI / 180);
    const dLat = (position2.latitude - position1.latitude) * (Math.PI / 180);
    const dLon = (position2.longitude - position1.longitude) * (Math.PI / 180);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = R * c; // 距离（千米）
    const accuracy = Math.pow(Math.pow(position1.accuracy, 2) + Math.pow(position2.accuracy, 2), 0.5);
    return {distance, accuracy};
  }
  
  // coordsWithTimestamps = [
  //   {latitude: 12.34567, longitude: 34.56789, accuracy: 10, timestamp: 1000},
  //   {latitude: 12.34678, longitude: 34.56890, accuracy: 5, timestamp: 2000},
  //   {latitude: 12.34789, longitude: 34.56901, accuracy: 3, timestamp: 3000},
  // ]
  // calculateDistance(coordsWithTimestamps[0], coordsWithTimestamps[1]);
  
  
server.listen(10002, () => {
  console.log('Server is running on port 10002');
});
