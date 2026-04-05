const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const basicAuth = require('express-basic-auth');
const gameState = require('./gameState');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configuração
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Autenticação básica para rotas admin
const adminAuth = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,
  realm: 'Bingo Admin'
});

// Middleware de validação de sala
const validateRoomName = (req, res, next) => {
  const { name } = req.params;
  // Sanitiza nome da sala: apenas letras, números e underscore, máximo 50 chars
  if (!name || !/^[a-zA-Z0-9_]{1,50}$/.test(name)) {
    return res.status(400).json({
      success: false,
      error: 'Nome de sala inválido',
      code: 'INVALID_ROOM_NAME'
    });
  }
  next();
};

// ======================
// ROTAS PÚBLICAS
// ======================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Listar todas as salas
app.get('/api/rooms', (req, res) => {
  const rooms = Object.keys(gameState.rooms).map(name => {
    const room = gameState.get(name);
    return {
      name,
      currentNumber: room.currentNumber,
      drawnNumbers: room.drawnNumbers,
      isShowingAll: room.isShowingAll,
      remaining: 75 - room.drawnNumbers.length,
      totalDrawn: room.drawnNumbers.length,
      lastActivity: room.lastActivity,
      status: room.drawnNumbers.length === 0 ? 'waiting'
        : room.drawnNumbers.length >= 75 ? 'completed'
        : 'active'
    };
  });

  res.json({ rooms, totalRooms: rooms.length });
});

// Obter sala específica
app.get('/api/rooms/:name', validateRoomName, (req, res) => {
  const { name } = req.params;
  const room = gameState.get(name);

  res.json({
    name,
    currentNumber: room.currentNumber,
    drawnNumbers: room.drawnNumbers,
    isShowingAll: room.isShowingAll,
    remaining: 75 - room.drawnNumbers.length,
    totalDrawn: room.drawnNumbers.length,
    lastActivity: room.lastActivity,
    status: room.drawnNumbers.length === 0 ? 'waiting'
      : room.drawnNumbers.length >= 75 ? 'completed'
      : 'active'
  });
});

// QR Code da sala
app.get('/api/qr/:name', validateRoomName, async (req, res) => {
  const { name } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/sala.html?room=${encodeURIComponent(name)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.json({ qr: qrDataUrl, url });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar QR code' });
  }
});

// ======================
// ROTAS PROTEGIDAS (ADMIN)
// ======================

// Sortear número
app.post('/api/rooms/:name/draw', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;
  const room = gameState.get(name);

  // Verificar se jogo já completou
  if (room.drawnNumbers.length >= 75) {
    return res.status(400).json({
      success: false,
      error: 'Todos os 75 números já foram sorteados',
      code: 'GAME_COMPLETED'
    });
  }

  // Gerar número randomico não sorteado
  const drawnNumbers = room.drawnNumbers;
  let number;
  do {
    number = Math.floor(Math.random() * 75) + 1;
  } while (drawnNumbers.includes(number));

  try {
    const updatedRoom = gameState.drawNumber(name, number);

    // Emitir para todos na sala
    io.to(name).emit('number-drawn', {
      room: name,
      number,
      drawnNumbers: updatedRoom.drawnNumbers,
      remaining: 75 - updatedRoom.drawnNumbers.length,
      totalDrawn: updatedRoom.drawnNumbers.length,
      timestamp: Date.now()
    });

    // Emitir atualização geral
    io.emit('room-updated', {
      name,
      currentNumber: number,
      drawnNumbers: updatedRoom.drawnNumbers,
      remaining: 75 - updatedRoom.drawnNumbers.length,
      totalDrawn: updatedRoom.drawnNumbers.length
    });

    res.json({
      success: true,
      room: name,
      number,
      drawnNumbers: updatedRoom.drawnNumbers,
      remaining: 75 - updatedRoom.drawnNumbers.length,
      totalDrawn: updatedRoom.drawnNumbers.length
    });
  } catch (error) {
    res.status(409).json({
      success: false,
      error: error.message,
      code: 'DRAW_ERROR'
    });
  }
});

// Resetar sala
app.post('/api/rooms/:name/reset', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;

  try {
    const room = gameState.reset(name);

    io.to(name).emit('room-reset', {
      room: name,
      timestamp: Date.now()
    });

    io.emit('room-updated', {
      name,
      currentNumber: null,
      drawnNumbers: [],
      remaining: 75,
      totalDrawn: 0
    });

    res.json({
      success: true,
      room: name,
      currentNumber: null,
      drawnNumbers: [],
      remaining: 75,
      totalDrawn: 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'RESET_ERROR'
    });
  }
});

// Mostrar todos os números
app.post('/api/rooms/:name/show-all', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;

  try {
    const room = gameState.setShowAll(name, true);

    io.to(name).emit('show-mode-changed', {
      room: name,
      isShowingAll: true
    });

    res.json({
      success: true,
      room: name,
      isShowingAll: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mostrar apenas último número
app.post('/api/rooms/:name/show-last', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;

  try {
    const room = gameState.setShowLast(name);

    io.to(name).emit('show-mode-changed', {
      room: name,
      isShowingAll: false
    });

    res.json({
      success: true,
      room: name,
      isShowingAll: false
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Definir preferência de voz
app.post('/api/rooms/:name/voice', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;
  const { voiceName } = req.body;

  if (!voiceName || typeof voiceName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'voiceName é obrigatório',
      code: 'INVALID_VOICE'
    });
  }

  try {
    const room = gameState.setVoicePreference(name, voiceName);

    io.to(name).emit('voice-preference-changed', {
      room: name,
      voicePreference: voiceName
    });

    res.json({
      success: true,
      room: name,
      voicePreference: voiceName
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================
// SOCKET.IO
// ======================

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Enviar confirmação de conexão
  socket.emit('connected', {
    socketId: socket.id,
    rooms: Object.keys(gameState.rooms)
  });

  // Entrar em uma sala
  socket.on('join-room', ({ roomName }) => {
    if (!roomName || !/^[a-zA-Z0-9_]{1,50}$/.test(roomName)) {
      socket.emit('error', {
        code: 'INVALID_ROOM_NAME',
        message: 'Nome de sala inválido'
      });
      return;
    }

    socket.join(roomName);
    const room = gameState.get(roomName);

    socket.emit('room-state', {
      name: roomName,
      currentNumber: room.currentNumber,
      drawnNumbers: room.drawnNumbers,
      isShowingAll: room.isShowingAll,
      remaining: 75 - room.drawnNumbers.length,
      totalDrawn: room.drawnNumbers.length
    });

    console.log(`Socket ${socket.id} entrou na sala ${roomName}`);
  });

  // Sair de uma sala
  socket.on('leave-room', ({ roomName }) => {
    socket.leave(roomName);
    console.log(`Socket ${socket.id} saiu da sala ${roomName}`);
  });

  // Assinar todas as salas
  socket.on('subscribe-all', () => {
    Object.keys(gameState.rooms).forEach(roomName => {
      socket.join(roomName);
    });
  });

  // Solicitar sorteio (apenas admins via socket)
  socket.on('draw-number', ({ roomName }) => {
    const room = gameState.get(roomName);

    if (room.drawnNumbers.length >= 75) {
      socket.emit('error', {
        code: 'GAME_COMPLETED',
        message: 'Todos os 75 números já foram sorteados'
      });
      return;
    }

    const drawnNumbers = room.drawnNumbers;
    let number;
    do {
      number = Math.floor(Math.random() * 75) + 1;
    } while (drawnNumbers.includes(number));

    try {
      const updatedRoom = gameState.drawNumber(roomName, number);

      io.to(roomName).emit('number-drawn', {
        room: roomName,
        number,
        drawnNumbers: updatedRoom.drawnNumbers,
        remaining: 75 - updatedRoom.drawnNumbers.length,
        totalDrawn: updatedRoom.drawnNumbers.length,
        timestamp: Date.now()
      });

      io.emit('room-updated', {
        name: roomName,
        currentNumber: number,
        drawnNumbers: updatedRoom.drawnNumbers,
        remaining: 75 - updatedRoom.drawnNumbers.length,
        totalDrawn: updatedRoom.drawnNumbers.length
      });
    } catch (error) {
      socket.emit('error', {
        code: 'DRAW_ERROR',
        message: error.message
      });
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// ======================
// INICIALIZAÇÃO
// ======================

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║        🎱 BINGO SERVER INICIADO 🎱           ║
╠═══════════════════════════════════════════════╣
║  Porta: ${PORT}                                  ║
║  Admin: ${ADMIN_USER} / ${ADMIN_PASS}                      ║
║  URL:   http://localhost:${PORT}                ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, salvando estado...');
  gameState.save();
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

module.exports = { app, server, io };
