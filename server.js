const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Estado do jogo
let gameState = {
    currentNumber: null,
    drawnNumbers: [],
    isShowingAll: false
};

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json(gameState);
});

app.post('/api/draw-number', (req, res) => {
    const { number } = req.body;
    
    if (!number || number < 1 || number > 75) {
        return res.status(400).json({ error: 'Número deve estar entre 1 e 75' });
    }
    
    if (gameState.drawnNumbers.includes(number)) {
        return res.status(400).json({ error: 'Número já foi sorteado' });
    }
    
    gameState.currentNumber = number;
    gameState.drawnNumbers.push(number);
    gameState.isShowingAll = false;
    
    // Notificar todos os clientes
    io.emit('numberDrawn', {
        number: number,
        total: gameState.drawnNumbers.length
    });
    
    res.json({ success: true, number: number });
});

app.post('/api/show-all', (req, res) => {
    gameState.isShowingAll = true;
    
    // Notificar todos os clientes para mostrar todos os números
    io.emit('showAll', {
        numbers: gameState.drawnNumbers.sort((a, b) => a - b)
    });
    
    res.json({ success: true, numbers: gameState.drawnNumbers });
});

app.post('/api/reset', (req, res) => {
    gameState = {
        currentNumber: null,
        drawnNumbers: [],
        isShowingAll: false
    };
    
    // Notificar todos os clientes sobre o reset
    io.emit('gameReset');
    
    res.json({ success: true });
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Enviar estado atual para novo cliente
    socket.emit('gameState', gameState);
    
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🎯 Servidor do Bingo rodando na porta ${PORT}`);
    console.log(`🌐 Servidor acessível em toda a rede!`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`📱 Ou pelo IP da rede: http://<SEU_IP>:${PORT}`);
    console.log(`🎮 Admin: http://<SEU_IP>:${PORT}/admin.html`);
    console.log(`📺 Display: http://<SEU_IP>:${PORT}/display.html`);
    console.log(`💡 Para descobrir seu IP: ifconfig | grep inet`);
});