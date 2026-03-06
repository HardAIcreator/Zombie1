const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Создаём приложение
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ ВАЖНО! Раздаём файлы из папки public
// __dirname = /opt/render/project/src
// public = /opt/render/project/src/public
app.use(express.static(path.join(__dirname, 'public')));

// Любой запрос отправляет index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====================== МУЛЬТИПЛЕЕР ======================
const players = new Map(); // { id: { x, z, rot, ws } }

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substring(7);
    console.log('Новый игрок:', playerId);
    
    // Отправляем новому игроку список всех текущих игроков
    players.forEach((player, id) => {
        ws.send(JSON.stringify({
            type: 'player_join',
            id: id,
            x: player.x,
            z: player.z,
            rot: player.rot
        }));
    });
    
    // Обработка сообщений от клиента
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            if (msg.type === 'move') {
                // Обновляем позицию игрока
                players.set(playerId, {
                    x: msg.x,
                    z: msg.z,
                    rot: msg.rot,
                    ws: ws
                });
                
                // Отправляем всем КРОМЕ отправителя
                broadcast({
                    type: 'player_move',
                    id: playerId,
                    x: msg.x,
                    z: msg.z,
                    rot: msg.rot
                }, ws);
            }
            
            if (msg.type === 'attack') {
                // Кто-то атаковал
                broadcast({
                    type: 'player_attack',
                    id: playerId,
                    weapon: msg.weapon
                }, ws);
            }
        } catch (e) {
            console.log('Ошибка:', e);
        }
    });
    
    // При отключении
    ws.on('close', () => {
        console.log('Игрок ушёл:', playerId);
        players.delete(playerId);
        broadcast({
            type: 'player_left',
            id: playerId
        });
    });
});

// Функция рассылки всем КРОМЕ отправителя
function broadcast(message, excludeWs) {
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// ====================== ЗАПУСК ======================
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('✅ ==========================');
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`✅ Раздаём файлы из: ${path.join(__dirname, 'public')}`);
    console.log(`✅ Ссылка: http://localhost:${PORT}`);
    console.log('✅ ==========================');
});
