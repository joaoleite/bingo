const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const basicAuth = require('express-basic-auth');

const { getNetworkIP } = require('./utils');
const gameState = require('./gameState');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuração de Segurança Básica
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bingo2024';
const authMiddleware = basicAuth({
    users: { 'admin': ADMIN_PASSWORD },
    challenge: true,
    realm: 'BingoAdminArea'
});

// Middleware
app.use(express.json());

// Rotas públicas (Display e Assets)
app.use(express.static(path.join(__dirname, 'public'), {
    index: false // Desabilita index.html automático para controlar rotas
}));

// Rota raiz redireciona para display ou login? 
// Vamos deixar o index.html público por enquanto, mas ele tem links pro admin.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/display.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

// Rotas Protegidas (Admin)
app.use('/admin.html', authMiddleware, express.static(path.join(__dirname, 'public', 'admin.html')));

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json(gameState.get());
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

// Rotas de Modificação de Estado (Protegidas)
const apiAuthMiddleware = (req, res, next) => {
    // Reutiliza a mesma auth ou verifica sessão. 
    // Como o admin.html chama essas APIs via fetch, o browser envia as credenciais se estiver na mesma origem.
    // Mas para garantir, podemos aplicar o auth aqui também.
    authMiddleware(req, res, next);
};

app.post('/api/draw-number', apiAuthMiddleware, (req, res) => {
    const { number } = req.body;

    try {
        if (!number || number < 1 || number > 75) {
            return res.status(400).json({ error: 'Número deve estar entre 1 e 75' });
        }

        const newState = gameState.drawNumber(number);

        io.emit('numberDrawn', {
            number: number,
            total: newState.drawnNumbers.length,
            drawnNumbers: newState.drawnNumbers
        });

        res.json({ success: true, number: number });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/show-last', apiAuthMiddleware, (req, res) => {
    const newState = gameState.setShowLast();

    io.emit('showLast', {
        number: newState.currentNumber,
        drawnNumbers: newState.drawnNumbers
    });

    res.json({ success: true, number: newState.currentNumber });
});

app.post('/api/show-all', apiAuthMiddleware, (req, res) => {
    const newState = gameState.setShowAll(true);

    io.emit('showAll', {
        numbers: newState.drawnNumbers.sort((a, b) => a - b)
    });

    res.json({ success: true, numbers: newState.drawnNumbers });
});

app.post('/api/reset', apiAuthMiddleware, (req, res) => {
    console.log('Reset solicitado');

    const newState = gameState.reset();

    console.log('Estado resetado');
    io.emit('gameReset');

    res.json({ success: true });
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Enviar estado atual para novo cliente
    socket.emit('gameState', gameState.get());

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    const networkIP = getNetworkIP();

    console.log(`🎯 Servidor do Bingo rodando na porta ${PORT}`);
    console.log(`🔒 Admin protegido (user: admin, pass: ${ADMIN_PASSWORD})`);
    console.log(`🏠 Acesso local: http://localhost:${PORT}`);
    console.log(`🌍 Acesso em rede: http://${networkIP}:${PORT}`);
});