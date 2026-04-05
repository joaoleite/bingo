# API Reference

## Base URL

```
http://localhost:3000/api
```

## Autenticação

Rotas administrativas requerem Basic Auth:

```
Authorization: Basic base64(username:password)
```

**Credenciais padrão:**
- Username: `admin`
- Password: `admin`

⚠️ **IMPORTANTE:** Altere as credenciais em produção!

---

## Endpoints

### Health Check

```
GET /health
```

Verifica se o servidor está online.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1765106968783,
  "uptime": 3600
}
```

---

### Listar Salas

```
GET /api/rooms
```

Retorna todas as salas e seus estados.

**Response:**
```json
{
  "rooms": [
    {
      "name": "salaA",
      "currentNumber": 5,
      "drawnNumbers": [5],
      "isShowingAll": false,
      "remaining": 74,
      "totalDrawn": 1,
      "lastActivity": 1765063002054
    },
    {
      "name": "public",
      "currentNumber": 39,
      "drawnNumbers": [32, 16, 11, 28, 4, 43, 19, 33, 26, 47, 70, 2, 52, 44, 62, 9, 58, 53, 1, 10, 14, 17, 29, 39],
      "isShowingAll": false,
      "remaining": 51,
      "totalDrawn": 24,
      "lastActivity": 1765106968783
    }
  ],
  "totalRooms": 2
}
```

---

### Obter Sala

```
GET /api/rooms/:name
```

Retorna o estado de uma sala específica.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| name | string | Nome da sala |

**Response:**
```json
{
  "name": "salaA",
  "currentNumber": 5,
  "drawnNumbers": [5],
  "isShowingAll": false,
  "remaining": 74,
  "totalDrawn": 1,
  "lastActivity": 1765063002054,
  "status": "active"
}
```

**Status da Sala:**
- `waiting` - Sala criada, nenhum número sorteado
- `active` - Jogo em andamento
- `completed` - Todos os 75 números sorteados

---

### Sortear Número

```
POST /api/rooms/:name/draw
```

Sorteia um novo número na sala especificada.

**Autenticação:** Requer Admin

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| name | string | Nome da sala |

**Response (sucesso):**
```json
{
  "success": true,
  "room": "salaA",
  "number": 23,
  "drawnNumbers": [5, 23],
  "remaining": 73,
  "totalDrawn": 2
}
```

**Response (erro - número duplicado):**
```json
{
  "success": false,
  "error": "Número já foi sorteado nesta sala",
  "code": "DUPLICATE_NUMBER"
}
```

**Response (erro - jogo completo):**
```json
{
  "success": false,
  "error": "Todos os 75 números já foram sorteados",
  "code": "GAME_COMPLETED"
}
```

---

### Resetar Sala

```
POST /api/rooms/:name/reset
```

Reseta a sala, limpando todos os números sorteados.

**Autenticação:** Requer Admin

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| name | string | Nome da sala |

**Response:**
```json
{
  "success": true,
  "room": "salaA",
  "currentNumber": null,
  "drawnNumbers": [],
  "remaining": 75,
  "totalDrawn": 0
}
```

---

### Mostrar Todos os Números

```
POST /api/rooms/:name/show-all
```

Ativa o modo que exibe todos os números sorteados simultaneamente.

**Autenticação:** Requer Admin

**Response:**
```json
{
  "success": true,
  "room": "salaA",
  "isShowingAll": true
}
```

---

### Mostrar Apenas Último

```
POST /api/rooms/:name/show-last
```

Desativa o modo "mostrar todos", voltando a exibir apenas o último número.

**Autenticação:** Requer Admin

**Response:**
```json
{
  "success": true,
  "room": "salaA",
  "isShowingAll": false
}
```

---

### Definir Preferência de Voz

```
POST /api/rooms/:name/voice
```

Define a voz preferida para síntese de texto (TTS).

**Autenticação:** Requer Admin

**Body:**
```json
{
  "voiceName": "Google Português"
}
```

**Response:**
```json
{
  "success": true,
  "room": "salaA",
  "voicePreference": "Google Português"
}
```

---

### Gerar QR Code

```
GET /api/qr/:name
```

Retorna QR code para acesso direto à sala.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| name | string | Nome da sala |

**Response:** Imagem PNG do QR code

---

## WebSocket API

### Conexão

```javascript
const socket = io('http://localhost:3000');
```

---

### Eventos (Cliente → Servidor)

#### `join-room`

Entra em uma sala para receber updates.

```javascript
socket.emit('join-room', { roomName: 'salaA' });
```

#### `leave-room`

Sai de uma sala.

```javascript
socket.emit('leave-room', { roomName: 'salaA' });
```

#### `subscribe-all`

Assina updates de todas as salas.

```javascript
socket.emit('subscribe-all');
```

---

### Eventos (Servidor → Cliente)

#### `connected`

Enviado ao conectar.

```javascript
{
  "socketId": "abc123",
  "rooms": ["salaA", "salaB"]
}
```

#### `room-state`

Estado atual de uma sala.

```javascript
{
  "name": "salaA",
  "currentNumber": 5,
  "drawnNumbers": [5],
  "isShowingAll": false,
  "remaining": 74,
  "totalDrawn": 1
}
```

#### `number-drawn`

Novo número foi sorteado.

```javascript
{
  "room": "salaA",
  "number": 23,
  "drawnNumbers": [5, 23],
  "remaining": 73,
  "totalDrawn": 2,
  "timestamp": 1765106968783
}
```

#### `room-reset`

Sala foi resetada.

```javascript
{
  "room": "salaA",
  "timestamp": 1765106968783
}
```

#### `error`

Erro occurred.

```javascript
{
  "code": "DUPLICATE_NUMBER",
  "message": "Número já foi sorteado nesta sala"
}
```

---

## Códigos de Erro

| Código | HTTP Status | Descrição |
|--------|-------------|-----------|
| `ROOM_NOT_FOUND` | 404 | Sala não existe |
| `DUPLICATE_NUMBER` | 409 | Número já foi sorteado |
| `GAME_COMPLETED` | 400 | Todos os números já sorteados |
| `INVALID_NUMBER` | 400 | Número fora do range 1-75 |
| `UNAUTHORIZED` | 401 | Credenciais inválidas |
| `FORBIDDEN` | 403 | Sem permissão para ação |

---

## Rate Limiting

Atualmente **não implementado**. Em produção, considere:
- 100 requests/minuto por IP para endpoints públicos
- 30 requests/minuto por IP para ações administrativas

---

## Exemplos

### cURL

```bash
# Listar salas
curl http://localhost:3000/api/rooms

# Sortear número (com auth)
curl -X POST http://localhost:3000/api/rooms/salaA/draw \
  -u admin:admin

# Resetar sala
curl -X POST http://localhost:3000/api/rooms/salaA/reset \
  -u admin:admin
```

### JavaScript (fetch)

```javascript
// Sortear número
const response = await fetch('http://localhost:3000/api/rooms/salaA/draw', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('admin:admin')
  }
});
const data = await response.json();
console.log(data.number);
```

### JavaScript (Socket.IO)

```javascript
const socket = io('http://localhost:3000');

socket.on('number-drawn', (data) => {
  console.log(`Número ${data.number} sorteado em ${data.room}`);
  // Atualizar UI
});

socket.emit('join-room', { roomName: 'salaA' });
```
