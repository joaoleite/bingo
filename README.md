# 🎱 Bingo

Bingo da família: o notebook ligado à caixa de som (ou à TV) mostra a bola e a cartela e fala cada número com voz neural; o celular vira o controle.

No ar em **https://bingo.jota.qzz.io** (controle em `/admin`).

## Como usar no dia

1. No notebook ligado à caixa de som: `npm start` e abra **http://localhost:3000**. Clique em **Ativar som** (e em **Tela cheia**, se quiser mostrar na TV).
2. No celular (mesmo Wi-Fi): escaneie o QR code do canto da tela ou abra o endereço `http://<ip-do-notebook>:3000/admin` que o servidor mostra ao iniciar. Login padrão `admin` / `admin` (mude com `ADMIN_USER` / `ADMIN_PASS`).
3. No celular: **Sortear número** (o servidor sorteia) ou toque no número que saiu do globo. Tocar num número já marcado fala ele de novo.
4. **Falar todos os números** recapitula os sorteados em ordem ("Letra B. Número 5..."). **Parar** interrompe. **Desfazer último** corrige toque errado.
5. Novo jogo e opções (falar 2 vezes, tocar som no próprio celular) ficam em **⚙️ Configurações**.

O chip no topo do controle mostra quantas caixas de som estão ativas. Se aparecer "nenhuma caixa de som", clique em **Ativar som** na tela do notebook.

Outros recursos do controle: **segure para falar** (grava a sua voz e toca na caixa de som), respostas rápidas ("sim, saiu", "não saiu", "vamos conferir"…), **modo conferir** para checar a cartela de quem gritou bingo e escolha de **em qual caixa de som tocar** quando há mais de uma.

## Rodar

```bash
npm install
npm start      # http://localhost:3000
npm run dev    # com hot-reload (nodemon)
```

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / `admin` | Login do controle. Em produção (`NODE_ENV=production`) o app **não sobe** sem `ADMIN_PASS` forte |
| `PUBLIC_URL` | descobre pelo acesso | Endereço usado no QR code (ex.: `https://bingo.jota.qzz.io`) |
| `STATE_FILE` | `game-state.json` | Onde o jogo em andamento é salvo |

Salas: tudo funciona por sala; o padrão é `public` e `?sala=<nome>` abre outra.

## Estrutura

```
server.js            Express + Socket.IO: sorteio, marcação, voz, gravações, QR
gameState.js         Estado das salas, salvo em JSON (com mutex)
public/index.html    Telão / caixa de som        → js/display.js
public/admin.html    Controle no celular          → js/admin.js
public/js/common.js  Cartela, bola, tocador de áudio (Announcer)
public/audio/<voz>/  MP3 de cada número e das respostas rápidas
scripts/gerar-audios.sh  Gera os áudios de uma voz (edge-tts)
```

Vozes disponíveis: `francisca`, `antonio`, `thalita`. Para gerar de novo ou criar outra: `scripts/gerar-audios.sh pt-BR-AntonioNeural` (precisa de internet e `uv`) e cadastre a voz em `VOICES` (`server.js`) e em `public/js/common.js`.

## Deploy

Coolify no VPS, a partir do `Dockerfile` / `docker-compose.yaml`. O jogo fica no volume `/data` e sobrevive a redeploy. `ADMIN_PASS` vem das variáveis de ambiente do Coolify.

## Versões anteriores

Este repositório guarda todas as tentativas de bingo, cada uma como tag. Veja [CHANGELOG.md](./CHANGELOG.md) e as ideias pendentes em [MELHORIAS.md](./MELHORIAS.md).

```bash
git checkout v1-bingoplay   # volta para qualquer versão antiga
```
