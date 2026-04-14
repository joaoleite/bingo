import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import QRCode from 'qrcode';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

app.get('/qr/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { displayUrl } = req.query;
    const url = `${displayUrl || 'https://bingopwa.jota.qzz.io'}?mode=display&room=${roomId}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    res.json({ qr: qrDataUrl, url, roomId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ roomId, exists: false, drawnNumbers: [], currentNumber: null, status: 'waiting' });
  }
  res.json({ roomId, exists: true, ...room });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('game-state', {
        drawnNumbers: room.drawnNumbers,
        currentNumber: room.currentNumber,
        status: room.status
      });
    }
  });

  socket.on('draw-number', ({ roomId, number, drawnNumbers, currentNumber, status }) => {
    const room = rooms.get(roomId) || {};
    rooms.set(roomId, { ...room, drawnNumbers, currentNumber, status, updatedAt: Date.now() });
    io.to(roomId).emit('number-drawn', { number, drawnNumbers, currentNumber, status });
  });

  socket.on('reset-game', ({ roomId }) => {
    rooms.set(roomId, { drawnNumbers: [], currentNumber: null, status: 'waiting', updatedAt: Date.now() });
    io.to(roomId).emit('game-reset');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});