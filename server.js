const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const basicAuth = require('express-basic-auth');
const qr = require('qrcode');
const utils = require('./utils');
const gameState = require('./gameState');

// Configuração
const port = 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bingo2024';

// Middleware para parsear JSON
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de Autenticação Básica
const authMiddleware = basicAuth({
    users: { 'admin': ADMIN_PASSWORD },
    challenge: true,
    realm: 'BingoAdmin'
});

// Helper para obter sala da Request
const getRoom = (req) => req.query.room || req.body.room || 'public';

// --- Rotas da API ---

// Status atual
app.get('/api/status', (req, res) => {
    const room = getRoom(req);
    res.json(gameState.get(room));
});

// Informações de Rede
app.get('/api/network-info', (req, res) => {
    const ip = utils.getNetworkIP();
    const room = getRoom(req);
    const roomQuery = room !== 'public' ? `?room=${room}` : '';

    res.json({
        ip: ip,
        adminUrl: `http://${ip}:${port}/admin.html${roomQuery}`,
        displayUrl: `http://${ip}:${port}/display.html${roomQuery}`
    });
});

// QR CODES
app.get('/api/qr/admin', async (req, res) => {
    try {
        const ip = utils.getNetworkIP();
        const room = getRoom(req);
        const roomQuery = room !== 'public' ? `?room=${room}` : '';
        const url = `http://${ip}:${port}/admin.html${roomQuery}`;
        const qrCode = await qr.toDataURL(url);
        res.json({ url, qrCode });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }
});

app.get('/api/qr/display', async (req, res) => {
    try {
        const ip = utils.getNetworkIP();
        const room = getRoom(req);
        const roomQuery = room !== 'public' ? `?room=${room}` : '';
        const url = `http://${ip}:${port}/display.html${roomQuery}`;
        const qrCode = await qr.toDataURL(url);
        res.json({ url, qrCode });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }
});

// --- Rotas Protegidas ---

// Sortear número
app.post('/api/draw-number', authMiddleware, (req, res) => {
    const { number, room: bodyRoom } = req.body;
    const room = bodyRoom || req.query.room || 'public';

    if (!number) return res.status(400).json({ error: 'Número é obrigatório' });

    try {
        const newState = gameState.drawNumber(room, number);
        io.to(room).emit('numberDrawn', { number, drawnNumbers: newState.drawnNumbers });
        io.to(room).emit('gameState', newState);
        res.json(newState);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Resetar jogo
app.post('/api/reset', authMiddleware, (req, res) => {
    const room = getRoom(req);
    const newState = gameState.reset(room);
    io.to(room).emit('gameReset');
    io.to(room).emit('gameState', newState);
    res.json(newState);
});

// Mostrar último número
app.post('/api/show-last', authMiddleware, (req, res) => {
    const room = getRoom(req);
    const newState = gameState.setShowLast(room);
    io.to(room).emit('showLast', {
        number: newState.currentNumber,
        drawnNumbers: newState.drawnNumbers
    });
    io.to(room).emit('gameState', newState);
    res.json(newState);
});

// Mostrar todos os números (Tabela)
app.post('/api/show-all', authMiddleware, (req, res) => {
    const room = getRoom(req);
    const newState = gameState.setShowAll(room, true);
    io.to(room).emit('showAll', { numbers: newState.drawnNumbers });
    io.to(room).emit('gameState', newState);
    res.json(newState);
});

// Toggle display mode (Show All / Show Current)
app.post('/api/toggle-display', (req, res) => {
    const { room } = req.body;
    const mode = req.query.mode; // 'all' or 'current' (optional explicit set)
    const newState = gameState.toggleDisplayMode(room, mode);
    io.to(room).emit('gameState', newState);
    res.json(newState);
});

// Set Voice Preference
app.post('/api/set-voice', (req, res) => {
    const { room, voice } = req.body;
    if (!voice) return res.status(400).json({ error: 'Voice name required' });

    const newState = gameState.setVoicePreference(room, voice);
    io.to(room).emit('gameState', newState);
    res.json(newState);
});

// Proteger a página de admin
app.use('/admin.html', authMiddleware);

// --- Socket.IO ---

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('joinRoom', (room) => {
        if (!room) room = 'public';
        socket.join(room);
        console.log(`Socket ${socket.id} entrou na sala: ${room}`);

        // Enviar estado atual da sala para quem acabou de entrar
        socket.emit('gameState', gameState.get(room));
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Iniciar servidor
http.listen(port, () => {
    console.log(`🎯 Servidor do Bingo rodando na porta ${port}`);
    console.log(`🔒 Admin protegido (user: admin, pass: ${ADMIN_PASSWORD})`);
    console.log(`🏠 Acesso local: http://localhost:${port}`);
    console.log(`🌍 Acesso em rede: http://${utils.getNetworkIP()}:${port}`);
});