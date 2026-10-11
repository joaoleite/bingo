const express = require('express');
const http = require('http');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || (IS_PRODUCTION ? '' : 'admin');
// Endereço público (ex.: https://bingo.jota.qzz.io); vazio = descobre pelo acesso
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

// Em produção o site é público: sem senha forte, não sobe (falha fechada)
if (IS_PRODUCTION && (!ADMIN_PASS || ADMIN_PASS === 'admin' || ADMIN_PASS.length < 8)) {
  console.error('ERRO: defina ADMIN_PASS com pelo menos 8 caracteres (e diferente de "admin") em produção.');
  process.exit(1);
}
const ROOM_REGEX = /^[a-zA-Z0-9_]{1,50}$/;
// Pastas de áudio em public/audio/ (a primeira é a padrão)
const VOICES = ['francisca', 'antonio', 'thalita'];
// Respostas rápidas (arquivos public/audio/<voz>/<id>.mp3)
const PHRASES = ['sim-saiu', 'nao-saiu', 'conferir', 'vencedor', 'aguarde'];
// Gravações feitas no celular: ficam só na memória, as mais recentes
const MAX_CLIPS = 30;
const clips = new Map(); // id -> { buffer, type }
const lastClipByRoom = new Map(); // sala -> url

// Atrás do Traefik/Cloudflare: confia no X-Forwarded-Proto para saber que é https
app.set('trust proxy', true);

// Middleware
app.use(express.json());
// Áudios não mudam durante o jogo: cache longo para não baixar de novo a cada número
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// Autenticação básica para rotas admin (sem challenge para o navegador não abrir o pop-up nativo)
const adminAuth = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: false,
  unauthorizedResponse: () => ({ success: false, error: 'Usuário ou senha incorretos', code: 'UNAUTHORIZED' })
});

// Middleware de validação de sala
const validateRoomName = (req, res, next) => {
  const { name } = req.params;
  // Sanitiza nome da sala: apenas letras, números e underscore, máximo 50 chars
  if (!name || !ROOM_REGEX.test(name)) {
    return res.status(400).json({
      success: false,
      error: 'Nome de sala inválido',
      code: 'INVALID_ROOM_NAME'
    });
  }
  next();
};

// Endereços IPv4 da rede local, para o celular conseguir acessar
function getLanAddresses() {
  const addresses = [];
  Object.values(os.networkInterfaces()).forEach(list => {
    (list || []).forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) addresses.push(iface.address);
    });
  });
  // Redes domésticas comuns primeiro
  return addresses.sort((a, b) => Number(!a.startsWith('192.168.')) - Number(!b.startsWith('192.168.')));
}

function serializeRoom(name) {
  const room = gameState.get(name);
  return {
    name,
    currentNumber: room.currentNumber,
    drawnNumbers: room.drawnNumbers,
    isShowingAll: room.isShowingAll,
    voice: VOICES.includes(room.voicePreference) ? room.voicePreference : VOICES[0],
    remaining: 75 - room.drawnNumbers.length,
    totalDrawn: room.drawnNumbers.length,
    lastActivity: room.lastActivity,
    status: room.drawnNumbers.length === 0 ? 'waiting'
      : room.drawnNumbers.length >= 75 ? 'completed'
      : 'active'
  };
}

// Envia o estado atualizado para todos os aparelhos da sala
function broadcastRoom(name) {
  const data = serializeRoom(name);
  io.to(name).emit('room-state', data);
  io.emit('room-updated', data);
  return data;
}

// Pede para as caixas de som da sala falarem algo
function announce(name, payload) {
  io.to(name).emit('announce', { room: name, ...payload, timestamp: Date.now() });
}

function parseRepeat(value) {
  const repeat = parseInt(value, 10);
  return repeat >= 1 && repeat <= 3 ? repeat : 1;
}

// Quantos aparelhos com som ativado estão na sala
async function broadcastSpeakers(name) {
  const sockets = await io.in(name).fetchSockets();
  const count = sockets.filter(s => s.data.speaker).length;
  io.to(name).emit('speakers', { room: name, count });
}

// Converte a gravação do celular (mp4 no iPhone, webm no Android) para MP3,
// corta o silêncio do começo e normaliza o volume para ficar parecido com a voz da IA
function convertClip(buffer) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `clip-${crypto.randomUUID()}`);
    fs.writeFileSync(tmp, buffer);
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', tmp, '-vn',
      '-af', 'highpass=f=80,silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-14:TP=-1.5:LRA=11',
      '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '4', '-f', 'mp3', 'pipe:1'
    ]);
    const chunks = [];
    let stderr = '';
    ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
    ffmpeg.stderr.on('data', data => { stderr += data; });
    ffmpeg.on('error', error => { fs.unlink(tmp, () => {}); reject(error); });
    ffmpeg.on('close', code => {
      fs.unlink(tmp, () => {});
      if (code === 0 && chunks.length) resolve(Buffer.concat(chunks));
      else reject(new Error(stderr.trim() || `ffmpeg saiu com código ${code}`));
    });
  });
}

function storeClip(buffer, type) {
  const id = crypto.randomUUID();
  clips.set(id, { buffer, type });
  while (clips.size > MAX_CLIPS) clips.delete(clips.keys().next().value);
  return `/api/clips/${id}`;
}

async function markNumber(name, number, repeat, res) {
  try {
    await gameState.drawNumber(name, number);
    const data = broadcastRoom(name);
    announce(name, { kind: 'number', number, repeat });
    res.json({ success: true, number, ...data });
  } catch (error) {
    res.status(409).json({ success: false, error: error.message, code: 'DRAW_ERROR' });
  }
}

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

// Controle do sorteio (celular)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Verifica credenciais do admin
app.get('/api/admin/check', adminAuth, (req, res) => {
  res.json({ success: true, user: req.auth.user });
});

// Endereços para abrir a tela e o controle de outro aparelho
app.get('/api/info', async (req, res) => {
  const room = ROOM_REGEX.test(req.query.sala || '') ? req.query.sala : 'bingo';
  // Acessando por localhost, o celular precisa do IP da rede; senão, o mesmo endereço do navegador
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.get('host') || '');
  const lan = getLanAddresses()[0];
  const base = PUBLIC_URL
    || (isLocal && lan ? `http://${lan}:${PORT}` : `${req.protocol}://${req.get('host')}`);
  const suffix = room === 'bingo' ? '' : `?sala=${room}`;
  const adminUrl = `${base}/admin${suffix}`;

  try {
    const adminQr = await QRCode.toDataURL(adminUrl, { width: 240, margin: 1 });
    res.json({ room, displayUrl: `${base}/${suffix}`, adminUrl, adminQr });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar QR code' });
  }
});

// Gravação do celular (id aleatório, guardada só na memória)
app.get('/api/clips/:id', (req, res) => {
  const clip = clips.get(req.params.id);
  if (!clip) return res.status(404).end();
  res.set('Content-Type', clip.type);
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(clip.buffer);
});

// Listar todas as salas
app.get('/api/rooms', (req, res) => {
  const rooms = Object.keys(gameState.rooms).map(serializeRoom);
  res.json({ rooms, totalRooms: rooms.length });
});

// Obter sala específica
app.get('/api/rooms/:name', validateRoomName, (req, res) => {
  res.json(serializeRoom(req.params.name));
});

// QR Code da tela da sala
app.get('/api/qr/:name', validateRoomName, async (req, res) => {
  const { name } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/?sala=${encodeURIComponent(name)}`;

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

// Sortear número aleatório
app.post('/api/rooms/:name/draw', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;
  const room = gameState.get(name);

  if (room.drawnNumbers.length >= 75) {
    return res.status(400).json({
      success: false,
      error: 'Todos os 75 números já foram sorteados',
      code: 'GAME_COMPLETED'
    });
  }

  const available = [];
  for (let n = 1; n <= 75; n++) {
    if (!room.drawnNumbers.includes(n)) available.push(n);
  }
  const number = available[Math.floor(Math.random() * available.length)];

  await markNumber(name, number, parseRepeat(req.body?.repeat), res);
});

// Marcar um número escolhido pelo admin (bolinha tirada do globo físico)
app.post('/api/rooms/:name/mark', adminAuth, validateRoomName, async (req, res) => {
  const number = parseInt(req.body?.number, 10);
  await markNumber(req.params.name, number, parseRepeat(req.body?.repeat), res);
});

// Desfazer o último número (toque por engano)
app.post('/api/rooms/:name/undo', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;
  const { removed } = await gameState.undo(name);
  if (removed) announce(name, { kind: 'stop' });
  const data = broadcastRoom(name);
  res.json({ success: true, removed, ...data });
});

// Falar de novo: um número, o último, ou todos os sorteados
app.post('/api/rooms/:name/announce', adminAuth, validateRoomName, (req, res) => {
  const { name } = req.params;
  const room = gameState.get(name);
  const { mode } = req.body || {};

  if (mode === 'all') {
    announce(name, { kind: 'recap', numbers: [...room.drawnNumbers].sort((a, b) => a - b) });
  } else if (mode === 'stop') {
    announce(name, { kind: 'stop' });
  } else if (mode === 'phrase') {
    if (!PHRASES.includes(req.body.phrase)) {
      return res.status(400).json({ success: false, error: 'Frase inválida', code: 'INVALID_PHRASE' });
    }
    announce(name, { kind: 'phrase', phrase: req.body.phrase });
  } else if (mode === 'check') {
    // "Já saiu o 32?" — fala o número e responde, sem marcar nada
    const number = parseInt(req.body.number, 10);
    if (!(number >= 1 && number <= 75)) {
      return res.status(400).json({ success: false, error: 'Número deve ser entre 1 e 75', code: 'INVALID_NUMBER' });
    }
    const drawn = room.drawnNumbers.includes(number);
    announce(name, { kind: 'check', number, drawn });
    return res.json({ success: true, number, drawn });
  } else if (mode === 'last-clip') {
    const url = lastClipByRoom.get(name);
    if (!url || !clips.has(url.split('/').pop())) {
      return res.status(400).json({ success: false, error: 'Nenhuma gravação para repetir', code: 'NO_CLIP' });
    }
    announce(name, { kind: 'clip', url });
  } else {
    const number = mode === 'number' ? parseInt(req.body.number, 10) : room.currentNumber;
    if (!room.drawnNumbers.includes(number)) {
      return res.status(400).json({ success: false, error: 'Esse número ainda não foi sorteado', code: 'NOT_DRAWN' });
    }
    announce(name, { kind: 'number', number, repeat: parseRepeat(req.body.repeat) });
  }

  res.json({ success: true });
});

// Gravação de voz do celular: converte e manda todo mundo tocar
app.post('/api/rooms/:name/clip', adminAuth, validateRoomName,
  express.raw({ type: ['audio/*', 'video/*', 'application/octet-stream'], limit: '10mb' }),
  async (req, res) => {
    const { name } = req.params;
    if (!Buffer.isBuffer(req.body) || req.body.length < 1000) {
      return res.status(400).json({ success: false, error: 'Gravação vazia ou curta demais', code: 'EMPTY_CLIP' });
    }

    let url;
    try {
      url = storeClip(await convertClip(req.body), 'audio/mpeg');
    } catch (error) {
      // Sem ffmpeg (ou falha na conversão): toca o arquivo original mesmo
      console.warn('Conversão da gravação falhou, usando original:', error.message);
      url = storeClip(req.body, (req.get('Content-Type') || 'audio/mp4').split(';')[0]);
    }

    lastClipByRoom.set(name, url);
    announce(name, { kind: 'clip', url });
    res.json({ success: true, url });
  });

// Resetar sala (novo jogo)
app.post('/api/rooms/:name/reset', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;

  try {
    await gameState.reset(name);
    io.to(name).emit('room-reset', { room: name, timestamp: Date.now() });
    const data = broadcastRoom(name);
    announce(name, { kind: 'new-game' });
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'RESET_ERROR'
    });
  }
});

// Mostrar todos os números
app.post('/api/rooms/:name/show-all', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;

  try {
    await gameState.setShowAll(name, true);
    io.to(name).emit('show-mode-changed', { room: name, isShowingAll: true });
    res.json({ success: true, room: name, isShowingAll: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mostrar apenas último número
app.post('/api/rooms/:name/show-last', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;

  try {
    await gameState.setShowLast(name);
    io.to(name).emit('show-mode-changed', { room: name, isShowingAll: false });
    res.json({ success: true, room: name, isShowingAll: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Definir preferência de voz
app.post('/api/rooms/:name/voice', adminAuth, validateRoomName, async (req, res) => {
  const { name } = req.params;
  const { voiceName } = req.body;

  if (!VOICES.includes(voiceName)) {
    return res.status(400).json({
      success: false,
      error: `Voz inválida. Opções: ${VOICES.join(', ')}`,
      code: 'INVALID_VOICE'
    });
  }

  try {
    await gameState.setVoicePreference(name, voiceName);
    broadcastRoom(name);
    // Toca uma frase de exemplo para ouvir a voz nova
    announce(name, { kind: 'voice-test' });
    res.json({ success: true, room: name, voicePreference: voiceName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================
// SOCKET.IO
// ======================

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.emit('connected', {
    socketId: socket.id,
    rooms: Object.keys(gameState.rooms)
  });

  // Entrar em uma sala
  socket.on('join-room', ({ roomName, speaker } = {}) => {
    if (!roomName || !ROOM_REGEX.test(roomName)) {
      socket.emit('error', {
        code: 'INVALID_ROOM_NAME',
        message: 'Nome de sala inválido'
      });
      return;
    }

    socket.join(roomName);
    socket.data.room = roomName;
    socket.data.speaker = Boolean(speaker);
    socket.emit('room-state', serializeRoom(roomName));
    broadcastSpeakers(roomName);

    console.log(`Socket ${socket.id} entrou na sala ${roomName}`);
  });

  // Aparelho ligou/desligou o som
  socket.on('speaker', ({ on } = {}) => {
    socket.data.speaker = Boolean(on);
    if (socket.data.room) broadcastSpeakers(socket.data.room);
  });

  // Sair de uma sala
  socket.on('leave-room', ({ roomName } = {}) => {
    socket.leave(roomName);
    if (roomName) broadcastSpeakers(roomName);
    console.log(`Socket ${socket.id} saiu da sala ${roomName}`);
  });

  socket.on('disconnect', () => {
    if (socket.data.room) broadcastSpeakers(socket.data.room);
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// ======================
// INICIALIZAÇÃO
// ======================

server.listen(PORT, () => {
  const lan = getLanAddresses()[0];
  const base = PUBLIC_URL || (lan ? `http://${lan}:${PORT}` : `http://localhost:${PORT}`);
  console.log(`
🎱 BINGO SERVER INICIADO
  Tela (caixa de som): ${PUBLIC_URL || `http://localhost:${PORT}`}
  Controle (celular):  ${base}/admin
  Admin: ${ADMIN_USER} / ${IS_PRODUCTION ? '(senha em ADMIN_PASS)' : ADMIN_PASS}
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
