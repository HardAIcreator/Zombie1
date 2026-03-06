const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ ПРАВИЛЬНЫЙ ПУТЬ К ПАПКЕ public
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// МУЛЬТИПЛЕЕР
const players = new Map();

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substring(7);
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if(msg.type === 'move') {
            players.set(id, { ...msg, ws });
            broadcast({
                type: 'player_move',
                id,
                x: msg.x,
                z: msg.z,
                rot: msg.rot
            }, ws);
        }
    });
    
    ws.on('close', () => {
        players.delete(id);
        broadcast({ type: 'player_left', id });
    });
    
    // Отправляем новому игроку всех остальных
    players.forEach((player, pid) => {
        if(pid !== id) {
            ws.send(JSON.stringify({
                type: 'player_join',
                id: pid,
                x: player.x,
                z: player.z,
                rot: player.rot
            }));
        }
    });
});

function broadcast(msg, exclude) {
    wss.clients.forEach(client => {
        if(client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
});
