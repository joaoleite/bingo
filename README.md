# 🎱 Bingo

## Como usar no dia

1. No notebook ligado à caixa de som: `npm start` e abra **http://localhost:3000**. Clique em **Ativar som** (e em **Tela cheia**, se quiser mostrar na TV).
2. No celular (mesmo Wi-Fi): escaneie o QR code do canto da tela ou abra o endereço `http://<ip-do-notebook>:3000/admin` que o servidor mostra ao iniciar. Login padrão `admin` / `admin` (mude com `ADMIN_USER` / `ADMIN_PASS`).
3. No celular: **Sortear número** (o servidor sorteia) ou toque no número que saiu do globo. Tocar num número já marcado fala ele de novo.
4. **Falar todos os números** recapitula os sorteados em ordem ("Letra B. Número 5..."). **Parar** interrompe. **Desfazer último** corrige toque errado.
5. Novo jogo e opções (falar 2 vezes, tocar som no próprio celular) ficam em **⚙️ Configurações**.

O chip no topo do controle mostra quantas caixas de som estão ativas. Se aparecer "nenhuma caixa de som", clique em **Ativar som** na tela do notebook.

Os áudios ficam em `public/audio/` (voz neural pt-BR). Para gerar de novo com outra voz: `scripts/gerar-audios.sh pt-BR-AntonioNeural` (precisa de internet e `uv`).


Sistema de Bingo em tempo real com servidor Node.js e cliente web.

## Status do Projeto

⚠️ **EM DESENVOLVIMENTO** - O projeto está em estado incompleto.

### Problemas Conhecidos

- [ ] `server.js` está faltando (arquivo principal do servidor)
- [ ] Diretório `public/` está vazio (sem interface web)
- [ ] Repositório git corrompido
- [ ] Sem testes automatizados

## Tecnologias

| Componente | Tecnologia | Versão |
|------------|------------|--------|
| Runtime | Node.js | - |
| Web Framework | Express.js | ^4.18.2 |
| WebSocket | Socket.IO | ^4.7.2 |
| QR Code | qrcode | ^1.5.4 |
| Auth | express-basic-auth | ^1.2.1 |
| Dev | nodemon | ^3.0.1 |

## Instalação

```bash
npm install
npm start      # Iniciar servidor
npm run dev   # Iniciar com hot-reload
```

## Estrutura do Projeto

```
bingoplay/
├── public/           # Arquivos estáticos do cliente web
├── game-state.json   # Estado persistido dos jogos
├── gameState.js      # Módulo de gerenciamento de estado
├── server.js         # Servidor Express + Socket.IO (FALTANDO)
└── package.json
```

## Salas Disponíveis

O sistema suporta múltiplas salas simultâneas:
- `salaA` - Sala de teste A
- `salaB` - Sala de teste B
- `public` - Sala pública padrão
- `QA` - Sala para QA
- `QA_Mobile` - Sala mobile para QA
- `TesteSala` - Sala de testes genérica
- `jt5jf` - Sala com jogo completo (75 números)
- `VisualDebug` - Sala para debug visual
- `VisualVerify` - Sala para verificação visual

## Configuração

### Variáveis de Ambiente

```env
PORT=3000                    # Porta do servidor (default: 3000)
ADMIN_USER=admin             # Usuário admin (default: admin)
ADMIN_PASS=admin             # Senha admin (default: admin)
STATE_FILE=game-state.json   # Arquivo de estado (default: game-state.json)
```

## API REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/rooms` | Lista todas as salas |
| GET | `/api/rooms/:name` | Retorna estado de uma sala |
| POST | `/api/rooms/:name/draw` | Sorteia um número |
| POST | `/api/rooms/:name/reset` | Reseta sala |
| POST | `/api/rooms/:name/show-all` | Mostra todos os números |
| POST | `/api/rooms/:name/show-last` | Mostra apenas último número |

### WebSocket Events

**Cliente → Servidor:**
- `join-room` - Entrar em uma sala
- `draw-number` - Solicitar sorteio
- `reset-room` - Resetar sala

**Servidor → Cliente:**
- `number-drawn` - Número foi sorteado
- `room-updated` - Estado da sala mudou
- `room-reset` - Sala foi resetada

## Documentação Adicional

- [TODO.md](./TODO.md) - Lista de tarefas
- [BUGS.md](./BUGS.md) - Bugs conhecidos
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica
- [API.md](./API.md) - Documentação da API
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guia de contribuição

## Licença

MIT
