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

### 4.0.0 — 2026-10-17
- Repositórios antigos reunidos aqui como tags; autor de todos os commits unificado.
- Faxina: `node_modules` e `.DS_Store` fora do git, documentação da época da recuperação removida, README reescrito.

### 2026-10-11
- Controle pelo celular com voz, tela da caixa de som e deploy no Coolify.
- Segure para falar, respostas rápidas e modo conferir.
- Escolher em qual caixa de som tocar; botão "Este celular" para tocar no próprio controle.
- Som do controle independente do websocket; primeiro toque após recarregar não perde o som; revisão para o Safari do iPhone.

### 2026-04-04
- Código da v1 recuperado de uma cópia local com o git corrompido: `server.js` e telas recriados, bugs críticos corrigidos, mutex no estado do jogo.
