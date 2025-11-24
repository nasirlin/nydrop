const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. 允許所有跨域請求，避免連線被擋
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
redis.on('error', (err) => console.error('Redis Error:', err));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log(`[Connect] ${socket.id}`);

    // 1. Sender 建立房間
    socket.on('create-room', async () => {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.set(`room:${roomId}`, socket.id, 'EX', 300);
        socket.join(roomId);
        socket.emit('room-created', roomId);
        console.log(`[Room Created] ${roomId}`);
    });

    // 2. Receiver 加入房間
    socket.on('join-room', async (roomId) => {
        const hostId = await redis.get(`room:${roomId}`);
        if (hostId) {
            socket.join(roomId);
            // ★ 關鍵：只通知 Host (Sender) 說有人來了
            io.to(hostId).emit('peer-joined', { peerId: socket.id });
            console.log(`[Joined] ${socket.id} joined ${roomId}`);
        } else {
            socket.emit('error', '代碼無效');
        }
    });

    // 3. 信號交換
    socket.on('signal', (data) => {
        const { roomId, signalData } = data;
        // ★ 關鍵：只傳給「對方」，不傳給自己
        socket.to(roomId).emit('signal', signalData);
    });

    socket.on('disconnect', () => console.log(`[Disconnect] ${socket.id}`));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));