const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

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

// Função para obter IP da rede
function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json(gameState);
});

app.get('/api/network-info', (req, res) => {
    const networkIP = getNetworkIP();
    const port = PORT;
    const baseUrl = `http://${networkIP}:${port}`;
    
    res.json({
        ip: networkIP,
        port: port,
        baseUrl: baseUrl,
        adminUrl: `${baseUrl}/admin.html`,
        displayUrl: `${baseUrl}/display.html`
    });
});

app.get('/api/qr/:type', async (req, res) => {
    try {
        const networkIP = getNetworkIP();
        const port = PORT;
        const type = req.params.type;
        
        let url;
        switch (type) {
            case 'admin':
                url = `http://${networkIP}:${port}/admin.html`;
                break;
            case 'display':
                url = `http://${networkIP}:${port}/display.html`;
                break;
            default:
                url = `http://${networkIP}:${port}`;
        }
        
        const qrCodeDataURL = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            url: url,
            qrCode: qrCodeDataURL
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }
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
    const networkIP = getNetworkIP();
    
    console.log(`🎯 Servidor do Bingo rodando na porta ${PORT}`);
    console.log(`🌐 Servidor acessível em toda a rede!`);
    console.log(`📱 IP da rede: ${networkIP}`);
    console.log(`🏠 Acesso local: http://localhost:${PORT}`);
    console.log(`🌍 Acesso em rede: http://${networkIP}:${PORT}`);
    console.log(`🎮 Admin: http://${networkIP}:${PORT}/admin.html`);
    console.log(`📺 Display: http://${networkIP}:${PORT}/display.html`);
    console.log(`� QR Codes disponíveis na interface admin!`);
});