# Histórico

O bingo foi o projeto usado para testar cada nova geração de IA. Cada tentativa era um repositório separado; em outubro de 2026 todos foram reunidos aqui, com o histórico completo de cada um preservado numa tag.

| Versão | Tag | Repositório de origem | Período | O que era |
|---|---|---|---|---|
| v1 | `v1-bingoplay` | `bingoplay` | set–dez/2025 | Node + Express + Socket.IO. Telão com bola animada, controle com senha, voz do navegador (`speechSynthesis`). Funcionava, com bugs no controle |
| v2 | `v2-bingomaster` | `bingoMaster-v2` | dez/2025 | Protótipo React/Vite gerado no Google AI Studio. Sincronizava só abas do mesmo navegador (`BroadcastChannel`) |
| v3 | `v3-bingoplaypwa` | `BingoPlayPWA` | abr/2026 | React + Tailwind + PWA offline para iOS, estado no IndexedDB. Nunca chegou a funcionar (tela branca, build quebrado) |
| v4 | `v4.0.0` | `bingo-familia` | abr–out/2026 | **Atual.** Recuperado do código da v1 e reescrito: áudios neurais pt-BR, controle pelo celular, segure para falar, escolha de caixa de som, modo conferir |

O que nunca foi mesclado também virou tag: as branches da v1 `v1-bingoplay-fix-high-priority-bugs` e `v1-bingoplay-fix-ipad-wake-lock`, e o PR #1 da v3 `v3-bingoplaypwa-pr1`.

```bash
git tag -n                 # lista as versões com a descrição
git checkout v3-bingoplaypwa
```

## v4

### 4.5.0 — 2026-10-18
- A página de criar bingo agora é a tela inicial (`/`). O telão de cada bingo continua em `/?sala=<nome>`; `/novo` redireciona para `/`, e `/admin` sem sala também.
- Sem sala padrão: a sala sem `?sala=` (a da família) saiu. A faxina de 48 horas parado vale para todos os bingos, com ou sem chave.
- Rodapé da tela inicial virou "Contribua no GitHub", com estrela, ideia ou bug e fork.

### 4.4.0 — 2026-10-17
Bingo público: qualquer pessoa cria o seu, sem cadastro.
- Página `/novo` ("Crie o seu bingo"): gera uma sala com nome sorteado (`pipoca-azul-4821`) e uma chave só dela. O anfitrião recebe o link do telão e o link do controle (com QR code).
- Cada sala aceita só a sua chave (header `X-Bingo-Key`; no link ela vai depois do `#` e o servidor guarda só o hash). Usuário e senha continuam sendo a chave mestra, e o único jeito de entrar na sala da família.
- Controle: entra direto com a chave guardada; avisa quando o bingo tem dono ou já foi apagado; em Configurações, botões para enviar o link do telão e do controle. O telão mostra o nome da sala.
- Bingos parados por 48 horas são apagados. Limite de 10 criações por hora por endereço e 500 bingos ao mesmo tempo.
- Corrigido: a lista de salas (`/api/rooms`) era pública, o estado de todas as salas ia para todos os aparelhos (`room-updated`) e a lista de nomes ia junto ao conectar. Olhar uma sala não cria mais a sala no arquivo.
- Corrigido: salas chamadas `__proto__` ou `constructor` davam erro 500 (as salas agora ficam num objeto sem protótipo).
- Log dos aparelhos limitado a 30 mensagens por minuto.
- 10 testes novos (27 no total), entre eles: a chave de um bingo não mexe em outro nem na sala da família.

### 4.3.0 — 2026-10-17
- Bola gigante: botão 🔍 no topo do telão (desligado por padrão, lembrado por aparelho). Cada número novo ocupa a tela por 4 segundos; desfazer não dispara.
- Socket.IO sem CORS aberto: só o próprio site conecta.
- Testes automáticos (`npm test`, com o executor do próprio Node): estado do jogo, senha, marcar/sortear/desfazer/novo jogo, variações das frases, CORS e a recusa de senha fraca em produção.
- Guardar os áudios com service worker saiu da lista: o cache com versão da 4.1.0 já resolve.

### 4.2.0 — 2026-10-17
Ideias trazidas das versões antigas, para o telão:
- Bola nova entra rolando e fica pulsando; bola com sombra interna e anel (v1/v2).
- Fundo da tela com a cor da letra do número atual (v2).
- Número atual pulsando e maior na cartela (v2).
- "Aguardando o primeiro número…" piscando antes de começar (v1).
- "BINGO!" com confete quando o controle toca "Temos vencedor!", em todas as telas da sala (v3).
- Últimos 10 números em vez de 6.
- Ícone para instalar na tela inicial do celular (iPhone e Android).
- Tudo parado para quem ativou "reduzir movimento" no sistema.

### 4.1.0 — 2026-10-17
- Respostas rápidas com 4 variações cada; o servidor sorteia sem repetir a anterior, e todas as caixas falam a mesma. O modo conferir também varia o "já saiu / não saiu".
- Voz mais rápida: os áudios das três vozes foram gerados de novo na velocidade natural (antes `-12%`).
- Áudios com versão na URL, para o navegador e o Cloudflare não continuarem tocando os arquivos antigos.

### 4.0.0 — 2026-10-17
- Repositórios antigos reunidos aqui como tags; autor de todos os commits unificado.
- Faxina: `node_modules` e `.DS_Store` fora do git, documentação da época da recuperação removida, README reescrito.
- Repositório público, com licença MIT, README com prints do telão e do controle.

### 2026-10-11
- Controle pelo celular com voz, tela da caixa de som e deploy no Coolify.
- Segure para falar, respostas rápidas e modo conferir.
- Escolher em qual caixa de som tocar; botão "Este celular" para tocar no próprio controle.
- Som do controle independente do websocket; primeiro toque após recarregar não perde o som; revisão para o Safari do iPhone.

### 2026-04-04
- Código da v1 recuperado de uma cópia local com o git corrompido: `server.js` e telas recriados, bugs críticos corrigidos, mutex no estado do jogo.
