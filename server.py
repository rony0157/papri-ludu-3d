"""
Papri & My Love — 3D Romantic Ludo Game Server
Python WebSocket + HTTP Server
"""

import asyncio
import json
import os
import mimetypes
import sys
from pathlib import Path

# Force UTF-8 stdout encoding for Windows compatibility
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
    import websockets

players = {}  # ws -> player_id (0 or 1)
sockets = {}  # player_id -> ws
game_started = False

def get_opponent_ws(player_id):
    opp_id = 1 - player_id
    return sockets.get(opp_id)

async def broadcast(msg, exclude_ws=None):
    for ws in list(players.keys()):
        if ws != exclude_ws:
            try:
                await ws.send(json.dumps(msg))
            except:
                pass

async def ws_handler(ws):
    global game_started

    if 0 not in sockets:
        pid = 0
    elif 1 not in sockets:
        pid = 1
    else:
        await ws.send(json.dumps({"action": "FULL", "msg": "Game is full! 2 players already connected."}))
        await ws.close()
        return

    players[ws] = pid
    sockets[pid] = ws

    print(f"Player {pid} connected ({'Papri' if pid == 0 else 'My Love'})")

    await ws.send(json.dumps({"action": "ASSIGNED", "playerId": pid}))

    if 0 in sockets and 1 in sockets:
        game_started = True
        await broadcast({"action": "GAME_START", "msg": "Both players connected! Game starting!"})
        print("Both players connected! Game started!")

    try:
        async for raw in ws:
            try:
                data = json.loads(raw)
            except:
                continue

            action = data.get("action", "")

            if action in ("DICE_ROLL", "MOVE_TOKEN", "PASS_TURN", "CHAT_MSG", "REACTION"):
                opp = get_opponent_ws(pid)
                if opp:
                    try:
                        await opp.send(raw)
                    except:
                        pass

    except websockets.ConnectionClosed:
        pass
    finally:
        if ws in players:
            del players[ws]
        if pid in sockets and sockets[pid] == ws:
            del sockets[pid]
        print(f"Player {pid} disconnected")
        await broadcast({"action": "PLAYER_LEFT", "playerId": pid, "msg": f"Player {pid} disconnected"})

class StaticFileServer:
    def __init__(self, root_dir, port=8000):
        self.root = Path(root_dir)
        self.port = port

    async def handle(self, reader, writer):
        try:
            request_line = await asyncio.wait_for(reader.readline(), timeout=5)
            request_line = request_line.decode('utf-8', errors='replace').strip()

            if not request_line:
                writer.close()
                return

            parts = request_line.split(' ')
            if len(parts) < 2:
                writer.close()
                return

            method = parts[0]
            path = parts[1]

            while True:
                line = await asyncio.wait_for(reader.readline(), timeout=5)
                if line == b'\r\n' or line == b'\n' or not line:
                    break

            if method != 'GET':
                writer.write(b'HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n')
                await writer.drain()
                writer.close()
                return

            if path == '/':
                path = '/index.html'
            path = path.split('?')[0]

            file_path = self.root / path.lstrip('/')

            if file_path.is_file():
                content = file_path.read_bytes()
                mime = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
                header = f'HTTP/1.1 200 OK\r\nContent-Type: {mime}\r\nContent-Length: {len(content)}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache\r\n\r\n'
                writer.write(header.encode() + content)
            else:
                body = b'404 Not Found'
                header = f'HTTP/1.1 404 Not Found\r\nContent-Length: {len(body)}\r\n\r\n'
                writer.write(header.encode() + body)

            await writer.drain()
            writer.close()
        except Exception:
            try:
                writer.close()
            except:
                pass

async def main():
    host = "0.0.0.0"
    ws_port = 8765
    http_port = 8000

    root_dir = os.path.dirname(os.path.abspath(__file__))

    file_server = StaticFileServer(root_dir, http_port)
    http_server = await asyncio.start_server(file_server.handle, host, http_port)
    ws_server = await websockets.serve(ws_handler, host, ws_port)

    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except:
        local_ip = "localhost"
    finally:
        s.close()

    print("=" * 60)
    print("Papri & My Love - 3D Romantic Ludo Game Server")
    print("=" * 60)
    print(f"  Game URL:  http://{local_ip}:{http_port}")
    print(f"  Local URL: http://localhost:{http_port}")
    print(f"  WebSocket: ws://{local_ip}:{ws_port}")
    print("=" * 60)

    await asyncio.gather(
        http_server.serve_forever(),
        ws_server.serve_forever()
    )

if __name__ == "__main__":
    asyncio.run(main())
