<div align="center">

# 🎱 Bingo da Família

**O notebook vira o telão e a caixa de som. O celular vira o controle.**
Cada número sorteado aparece grande na TV e é falado em voz alta, com voz neural em português.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-pronto-2496ED?logo=docker&logoColor=white)
![Idioma](https://img.shields.io/badge/idioma-pt--BR-009c3b)
![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

### [🎲 Crie o seu bingo agora →](https://bingo.jota.qzz.io)
Grátis, sem cadastro e sem instalar nada.

</div>

<table>
  <tr>
    <td width="72%"><img src="docs/telao.png" alt="Telão: bola com o último número, números anteriores e a cartela B-I-N-G-O com os sorteados coloridos"></td>
    <td width="28%"><img src="docs/controle.png" alt="Controle no celular: sortear, repetir, desfazer, segure para falar, respostas rápidas e cartela de toque"></td>
  </tr>
  <tr>
    <td align="center"><b>Telão</b> — fica na TV ou no notebook ligado à caixa de som</td>
    <td align="center"><b>Controle</b> — no celular de quem canta</td>
  </tr>
</table>

## Como funciona

```mermaid
flowchart LR
    C["📱 Controle<br/>(celular)"] -- sorteia / marca --> S["🖥️ Servidor<br/>Node + Socket.IO"]
    S -- número + áudio --> T1["📺 Telão + caixa de som<br/>(Sala)"]
    S -- número + áudio --> T2["🔊 Outra caixa<br/>(Varanda)"]
    S -. estado .-> D[("game-state.json")]
```

Quem canta usa o celular. O servidor guarda o jogo e avisa todas as telas na hora; cada tela com som ativado fala o número. Dá para ter várias caixas de som e escolher em qual tocar.

## O que dá para fazer

**No telão**
- 🎱 Bola grande com o último número, colorida pela letra (B azul, I vermelho, N branco, G verde, O laranja). Cada número novo entra rolando, e a bola fica pulsando
- 🎨 O fundo da tela ganha a cor da letra do número atual, para reconhecer de longe
- 🟦 Cartela com os 75 números; os sorteados acendem e o número atual pulsa
- 🕘 Os últimos 10 números em fichas, para quem se distraiu
- 🎉 **"BINGO!" com confete** quando o controle avisa "Temos vencedor!"
- 🔍 **Bola gigante** (botão no topo de cada telão): cada número novo ocupa a tela inteira por 4 segundos, para quando a TV fica longe
- 🗣️ Fala cada número com voz neural pt-BR ("Letra N. Número 44"), com opção de falar duas vezes
- 📲 QR code no canto para abrir o controle no celular
- ⛶ Tela cheia e tela sempre acesa (não apaga no meio do jogo)

**No celular (controle)**
- 🎲 **Sortear número**, ou tocar no número que saiu do globo físico
- 🔁 **Repetir último** · ↩️ **Desfazer último** (toque errado acontece)
- 📣 **Falar todos os números** em ordem, destacando cada um no telão enquanto fala
- 🎙️ **Segure para falar**: grava sua voz e toca na caixa de som, com volume ajustado para ficar parecido com a voz da IA
- 💬 **Respostas rápidas**: "Sim, já saiu!", "Ainda não saiu", "Vamos conferir", "Temos vencedor!", "Um momento", cada uma com 4 jeitos de falar, sorteados sem repetir a anterior
- 🔎 **Modo conferir**: quando alguém grita bingo, toque nos números da cartela dele para ver se já saíram, sem marcar nada
- 🔊 **Escolher a caixa de som**: tocar em todas, só em uma, ou no próprio celular
- ⚙️ Três vozes (Francisca, Antonio, Thalita), novo jogo e opções
- 📲 Instala na tela inicial do celular, com ícone próprio (no iPhone: Compartilhar → Adicionar à Tela de Início)

<p align="center"><img src="docs/bingo.png" alt="Telão com BINGO! em letras coloridas e confete caindo" width="80%"></p>

**Por trás**
- 💾 O jogo é salvo em disco: reiniciar o servidor ou recarregar a página não perde os números
- 🔒 Cada bingo tem a sua chave: só quem tem o link do controle sorteia
- 🧘 Quem ativou "reduzir movimento" no sistema vê o telão sem animações
- 🏠 Cada bingo é um jogo independente no mesmo servidor, com o seu telão, o seu controle e as suas caixas de som; o que fica 48 horas parado é apagado

## Crie o seu bingo (sem instalar nada)

<img src="docs/novo.png" alt="Página Crie o seu bingo" width="260" align="right">

Abra **[bingo.jota.qzz.io](https://bingo.jota.qzz.io)** e toque em **Criar meu bingo**. Você recebe:

1. **O link do telão**, para abrir na TV ou no notebook ligado à caixa de som. Pode mostrar para todo mundo.
2. **O link do controle**, com um QR code para abrir no seu celular. É ele que sorteia: só quem tem esse link manda no bingo. Ele fica salvo no celular e em ⚙️ Configurações do controle, de onde dá para enviar para outra pessoa ajudar.

Cada bingo é separado dos outros: ninguém mexe no seu, e você não mexe no de ninguém. O bingo é apagado depois de 48 horas parado.

<br clear="right">

## Começar em 2 minutos

Precisa de [Node.js](https://nodejs.org) 22 ou mais novo.

```bash
git clone https://github.com/joaoleite/bingo.git
cd bingo
npm install
npm start
```

(`npm test` roda os testes automáticos; `npm run dev` reinicia o servidor a cada mudança no código.)

1. No notebook ligado à caixa de som, abra **http://localhost:3000** e toque em **Criar meu bingo**.
2. Clique em **Abrir o telão**, depois em **Ativar som** e, se quiser, em **Tela cheia**.
3. No celular, no mesmo Wi-Fi, escaneie o QR code do controle (ele já aponta para o IP do notebook na rede) e toque em **🎲 Sortear número** ou no número que saiu do globo. Pronto.

O chip no topo do controle mostra quantas caixas de som estão ativas. Se aparecer "nenhuma caixa de som", clique em **Ativar som** na tela do notebook.

> **Microfone:** o navegador do celular só libera o microfone (o "segure para falar") em endereço **https**. Na rede local por `http://`, o resto funciona normalmente; para usar a voz, publique com HTTPS (veja abaixo).
>
> **ffmpeg** (opcional): se estiver instalado, as gravações do celular são convertidas para MP3 com volume normalizado. Sem ele, a gravação toca como veio.

## Configuração

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / `admin` | Chave mestra do dono do servidor. Com `NODE_ENV=production`, o app **não sobe** se a senha for `admin` ou tiver menos de 8 caracteres |
| `PUBLIC_URL` | descobre pelo acesso | Endereço usado no QR code, ex.: `https://bingo.seudominio.com` |
| `STATE_FILE` | `game-state.json` | Onde o jogo em andamento é salvo |
| `ROOM_TTL_HOURS` | `48` | Bingos são apagados depois desse tempo parados |
| `ROOM_CREATE_LIMIT` | `10` | Quantos bingos o mesmo endereço pode criar por hora |
| `MAX_OWNED_ROOMS` | `500` | Máximo de bingos ao mesmo tempo |

**Quem manda em cada bingo:** cada um aceita a sua chave, que vem no link do controle depois do `#` e fica guardada só como hash no servidor. Usuário e senha do `ADMIN_USER`/`ADMIN_PASS` são a chave mestra: entram em qualquer bingo (`/admin?sala=<nome>`).

## Publicar com Docker

```bash
docker build -t bingo .
docker run -d -p 3000:3000 \
  -e ADMIN_PASS='uma-senha-forte' \
  -e PUBLIC_URL='https://bingo.seudominio.com' \
  -v bingo-dados:/data \
  bingo
```

O volume `/data` guarda o jogo e faz ele sobreviver a atualizações. O `docker-compose.yaml` do repositório é o usado em produção no [Coolify](https://coolify.io) (o proxy dele cuida do HTTPS); serve de modelo para qualquer plataforma com Docker Compose.

## Estrutura

```
server.js              Express + Socket.IO: sorteio, marcação, voz, gravações, QR
gameState.js           Estado das salas, salvo em JSON (com mutex)
public/novo.html       Página inicial "Crie o seu bingo" (/)  → js/novo.js
public/index.html      Telão / caixa de som (/?sala=)         → js/display.js
public/admin.html      Controle no celular (/admin?sala=)     → js/admin.js
public/js/common.js    Cartela, bola, tocador de áudio
public/audio/<voz>/    MP3 de cada número e das respostas rápidas
scripts/gerar-audios.sh  Gera os áudios de uma voz
```

**Outra voz:** `scripts/gerar-audios.sh pt-BR-AntonioNeural` gera os áudios com [edge-tts](https://github.com/rany2/edge-tts) (precisa de internet e [uv](https://docs.astral.sh/uv/)). Depois cadastre a voz em `VOICES` (`server.js`) e em `public/js/common.js`. O segundo argumento muda a velocidade (padrão `+0%`; ex.: `-10%` para falar mais devagar). Para mudar ou acrescentar variações das respostas rápidas, edite as linhas `frases` do script e a quantidade em `PHRASES` (`server.js` e `public/js/common.js`).

## A história deste repositório

Este bingo foi o projeto que usei para aprender a trabalhar com cada nova geração de IA. Cada tentativa nasceu num repositório diferente; hoje estão todas aqui, cada uma numa tag com o histórico completo:

| Versão | Tag | Quando | Como era |
|---|---|---|---|
| v1 | `v1-bingoplay` | 2025 | Node + Socket.IO, voz do navegador |
| v2 | `v2-bingomaster` | dez/2025 | Protótipo React gerado no Google AI Studio |
| v3 | `v3-bingoplaypwa` | abr/2026 | React + PWA offline para iPhone (nunca funcionou direito) |
| v4 | `v4.0.0` | 2026 | **Esta.** Voz neural, controle no celular, várias caixas de som |

```bash
git checkout v1-bingoplay   # volta no tempo
git checkout main           # e volta para a versão atual
```

Detalhes em [CHANGELOG.md](./CHANGELOG.md). Ideias para as próximas versões em [MELHORIAS.md](./MELHORIAS.md).

## Contribua

Achou um bug, pensou numa resposta rápida engraçada ou quer uma voz nova? [Abra uma issue](https://github.com/joaoleite/bingo/issues/new) ou mande um pull request: `npm test` precisa passar. Se o bingo animou a sua festa, deixe uma ⭐.

## Licença

[MIT](./LICENSE) © João Leite
