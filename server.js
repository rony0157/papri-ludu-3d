const { WebSocketServer } = require('ws');
const http = require('http');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('Papri & Lover 3D Ludo WebSocket Server Running');
});

const wss = new WebSocketServer({ server });

let clients = [];

wss.on('connection', (ws) => {
  let playerId = -1;

  if (!clients[0]) {
    playerId = 0;
    clients[0] = ws;
  } else if (!clients[1]) {
    playerId = 1;
    clients[1] = ws;
  } else {
    ws.send(jsonMsg('FULL', { msg: 'Room is full' }));
    ws.close();
    return;
  }

  console.log(`Player ${playerId} connected`);
  ws.send(jsonMsg('ASSIGNED', { playerId }));

  if (clients[0] && clients[1]) {
    const startMsg = jsonMsg('GAME_START', { msg: 'Both connected!' });
    clients[0].send(startMsg);
    clients[1].send(startMsg);
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const oppId = 1 - playerId;
      if (clients[oppId] && clients[oppId].readyState === 1) {
        clients[oppId].send(JSON.stringify(data));
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    if (clients[playerId] === ws) {
      clients[playerId] = null;
    }
    const oppId = 1 - playerId;
    if (clients[oppId] && clients[oppId].readyState === 1) {
      clients[oppId].send(jsonMsg('PLAYER_LEFT', { playerId }));
    }
  });
});

function jsonMsg(action, payload = {}) {
  return JSON.stringify({ action, payload });
}

server.listen(port, () => {
  console.log(`Ludo WebSocket Server running on port ${port}`);
});
