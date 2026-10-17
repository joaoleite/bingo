# Melhorias

Ideias tiradas das versões antigas (tags `v1`–`v3`, ver [CHANGELOG.md](./CHANGELOG.md)) e do uso real. A v4 já ganha das anteriores em tudo que é funcional; o que as antigas têm de melhor é **visual, no telão**.

Para ver o código de origem: `git show v1-bingoplay:public/style.css`.

Esforço: **P** = uma tarde ou menos · **M** = um dia · **G** = mais que isso.

## Telão (prioridade)

- [ ] **Bola entra com animação e fica pulsando** — P
  Hoje a bola só cresce (`.ball.pop`, `public/css/style.css:107`). A v1 fazia a bola entrar e sair rolando e depois pulsar (`v1-bingoplay:public/style.css:708-745` e `v1-bingoplay:public/display.html:338-378`). A v2 fazia cair com quique, com curva elástica (`v2-bingomaster:index.html:25-45`). Escolher uma das duas.
- [ ] **Bola com profundidade** — P
  Sombra interna e anel translúcido, como na v1 (`v1-bingoplay:public/style.css:641-682`).
- [ ] **Fundo do telão tingido com a cor da letra** — P
  O painel da bola ganha a cor de B/I/N/G/O em baixa opacidade, como na v2 (`v2-bingomaster:pages/Display.tsx:274`). Deixa a letra reconhecível de longe.
- [ ] **Número atual pulsando e maior na cartela** — P
  Hoje só ganha borda amarela. A v2 aumentava e pulsava (`v2-bingomaster:components/BingoBoard.tsx:25`).
- [ ] **"Aguardando próximo número…" animado** — P
  No lugar do "–" antes do primeiro sorteio (`v1-bingoplay:public/style.css:609-633`).
- [ ] **Comemoração "BINGO!" na tela** — P
  Quando o controle toca a resposta rápida "🏆 Temos vencedor!" (`public/js/common.js:17`), o telão mostra confete e um "BINGO!" grande além do áudio. A v3 tinha algo parecido no fim do jogo (`v3-bingoplaypwa:src/App.tsx:406-424`).
- [ ] **Mais números recentes** — P
  O telão mostra os últimos 6 (`public/js/display.js:46`). Dá para mostrar 10 sem apertar a tela.
- [ ] **Modo "bola gigante" após o sorteio** — M, opcional
  A bola ocupa a tela toda por alguns segundos e depois volta para a cartela. Útil quando a TV fica longe. Inspirado no "mostrar último / mostrar todos" da v1 (`v1-bingoplay:server.js:107-126`).

## Celular / instalação

- [ ] **Ícones para instalar na tela inicial** — P
  `public/manifest.json` tem `"icons": []` e não há `apple-touch-icon`. Fazer um ícone de bola (192 e 512 px) e declarar nos dois.
- [ ] **Guardar os áudios no aparelho (service worker)** — M
  Os ~5,5 MB de MP3 ficariam em cache, e o som sairia mais rápido em Wi-Fi ruim. Não deixa o app offline (o controle depende do servidor). Cuidado para não servir JS antigo depois de um deploy.

## Código

- [ ] **CORS do Socket.IO aberto (`origin: '*'`)** — P
  `server.js:15-20`. Como telão e controle saem do mesmo domínio, dá para remover.
- [ ] **Testes automáticos do básico** — M
  Sortear, marcar, desfazer, novo jogo e persistência do `gameState.js`. Hoje não há nenhum.

## Não vale trazer

Decidido ao comparar as versões, para não voltar a discutir:

- **Voz do navegador** (`speechSynthesis`, v1/v2): muda de aparelho para aparelho e falha no iOS. Os MP3 neurais são melhores.
- **Modo 90 bolas** (v2/v3): mexe no servidor e na cartela e exige gravar os áudios 76–90.
- **App offline / estado no aparelho** (v3) e **sincronização só entre abas** (v2): o servidor com Socket.IO é o que permite vários celulares e caixas de som.
- **Página para escolher sala** (v1): `?sala=` resolve para uso em família.
- **Truque do vídeo para manter a tela acesa** (v1): instável no iPad, e o wake lock nativo basta.
- **Digitar o número** (v1/v3): o teclado de toque da v4 é mais rápido.
