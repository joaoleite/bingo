# Arquitetura Técnica

## Visão Geral

```
┌─────────────────┐     HTTP/REST + WebSocket      ┌─────────────────┐
│                 │ ─────────────────────────────► │                 │
│   Cliente Web   │ ◄────────────────────────────── │   Servidor      │
│   (Browser)     │                                 │   (Node.js)     │
│                 │                                 │                 │
└─────────────────┘                                 └────────┬────────┘
                                                              │
                                                    ┌─────────▼────────┐
                                                    │                   │
                                                    │   gameState.js    │
                                                    │   (Singleton)     │
                                                    │                   │
                                                    └─────────┬─────────┘
                                                              │
                                                    ┌─────────▼─────────┐
                                                    │                   │
                                                    │   game-state.json │
                                                    │   (Persistence)   │
                                                    └───────────────────┘
```

## Stack Tecnológica

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
│  HTML5 + CSS3 + JavaScript (Vanilla)                        │
│  Socket.IO Client                                            │
│  Responsive Design (CSS Grid/Flexbox)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP REST + WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                        SERVIDOR                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Express    │  │  Socket.IO   │  │    QRCode        │  │
│  │   (HTTP)     │  │  (WebSocket) │  │    Generator     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    gameState.js                       │  │
│  │  ┌─────────┐ ┌────────────┐ ┌────────────────────┐   │  │
│  │  │ Rooms   │ │  Drawing  │ │   Persistence      │   │  │
│  │  │ Manager │ │  Logic    │ │   (JSON file)      │   │  │
│  │  └─────────┘ └────────────┘ └────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Dados

### Sala (Room)

```typescript
interface Room {
  currentNumber: number | null;   // Último número sorteado
  drawnNumbers: number[];          // Números já sorteados (1-75)
  isShowingAll: boolean;           // Modo de exibição
  voicePreference: string;         // Preferência de voz TTS
  lastActivity: number;            // Timestamp Unix
}
```

### Estados da Sala

```
┌─────────────┐
│  ACTIVE     │ ← Sala com números sendo sorteados
├─────────────┤
│  WAITING    │ ← Sala criada, nenhum número sorteado
├─────────────┤
│  COMPLETED  │ ← Todos os 75 números sorteados
├─────────────┤
│  IDLE       │ ← Sala sem atividade (timeout)
└─────────────┘
```

## API REST

### Endpoints

```
GET    /api/rooms                    # Lista todas as salas
GET    /api/rooms/:name              # Estado de uma sala
POST   /api/rooms/:name/draw         # Sorteia próximo número
POST   /api/rooms/:name/reset        # Reseta sala
POST   /api/rooms/:name/show-all     # Ativa modo mostrar todos
POST   /api/rooms/:name/show-last    # Volta ao modo normal
POST   /api/rooms/:name/voice        # Define preferência de voz
GET    /api/qr/:name                 # QR code da sala
GET    /health                       # Health check
```

### Response Examples

```json
// GET /api/rooms/salaA
{
  "name": "salaA",
  "currentNumber": 42,
  "drawnNumbers": [5, 23, 42],
  "isShowingAll": false,
  "remaining": 72,
  "totalDrawn": 3
}
```

## WebSocket Events

### Cliente → Servidor

| Event | Payload | Descrição |
|-------|---------|-----------|
| `join-room` | `{ roomName }` | Entra em uma sala |
| `leave-room` | `{ roomName }` | Sai de uma sala |
| `draw-number` | `{ roomName }` | Solicita sorteio |
| `reset-room` | `{ roomName }` | Reseta sala |
| `subscribe-all` | - | Recebe updates de todas |

### Servidor → Cliente

| Event | Payload | Descrição |
|-------|---------|-----------|
| `room-state` | `{ room }` | Estado atual da sala |
| `number-drawn` | `{ room, number, drawnNumbers }` | Novo número |
| `room-reset` | `{ room }` | Sala foi resetada |
| `error` | `{ message }` | Erro occurred |

## Fluxo de Sorteio

```
1. Admin clica "Sortear"
         │
         ▼
2. POST /api/rooms/:name/draw
         │
         ▼
3. gameState.drawNumber() validado
   - Verifica se número já foi sorteado
   - Gera próximo número único
         │
         ▼
4. Estado salvo em game-state.json
         │
         ▼
5. Socket.IO emite 'number-drawn'
         │
         ▼
6. Todos os clientes na sala atualizam UI
```

## Persistência

### game-state.json

```json
{
  "salaA": {
    "currentNumber": 5,
    "drawnNumbers": [5],
    "isShowingAll": false,
    "voicePreference": "default",
    "lastActivity": 1765106968783
  }
}
```

### Ciclo de Vida

```
┌────────────┐
│   Load     │ ← Lê game-state.json na inicialização
├────────────┤
│   Watch    │ ← Monitora alterações no arquivo
├────────────┤
│   Update   │ ← Salva após cada modificação
├────────────┤
│   Backup   │ ← Backup periódico (sugestão futura)
└────────────┘
```

## Segurança

### Autenticação

```
┌─────────────────────────────────────┐
│        Basic Auth (HTTP)            │
│  ┌─────────────────────────────┐   │
│  │  Header: Authorization      │   │
│  │  Basic base64(user:pass)    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Ranking de Proteção

| Rota | Proteção | Notas |
|------|----------|-------|
| GET /api/rooms | Público | Qualquer um pode ver salas |
| POST /api/rooms/:name/draw | Admin | Apenas admin pode sortear |
| POST /api/rooms/:name/reset | Admin | Apenas admin pode resetar |

## Futuras Melhorias Arquiteturais

### Pensadas mas não implementadas

1. **Banco de Dados** - Substituir JSON por SQLite/PostgreSQL
2. **Cache Redis** - Para múltiplas instâncias
3. **Message Queue** - Para operações assíncronas
4. **Microserviços** - Separar API, WebSocket, Worker

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  API Server │   │ WS Server   │   │  Worker     │
│  (Express)  │   │ (Socket.IO) │   │  (Drawing)  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                   ┌──────▼──────┐
                   │    Redis    │
                   │   (Cache)   │
                   └─────────────┘
```

---

## Glossário

| Termo | Definição |
|-------|-----------|
| Sala | Instância独立的 de jogo de Bingo |
| Sorteio | Ação de sortear um novo número (1-75) |
| Admin | Usuário com permissão para sortear/resetar |
| Cliente | Interface web no browser do jogador |
| TTS | Text-to-Speech (síntese de voz) |
