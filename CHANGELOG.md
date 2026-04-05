# Changelog

Todas as mudançasnotáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [1.0.0] - 2026-04-04

### Added (Funcionalidades Adicionadas)

- Estrutura base do projeto com package.json
- Dependências configuradas:
  - express (^4.18.2)
  - socket.io (^4.7.2)
  - qrcode (^1.5.4)
  - express-basic-auth (^1.2.1)
  - nodemon (^3.0.1)
- Módulo gameState.js com:
  - Gerenciamento de múltiplas salas
  - Persistência em arquivo JSON
  - Métodos: drawNumber, reset, setShowAll, setShowLast
  - Validação de números duplicados
- Arquivo game-state.json com 9 salas pré-configuradas:
  - salaA, salaB, public, QA, QA_Mobile
  - TesteSala, jt5jf, VisualDebug, VisualVerify

### Known Issues (Problemas Conhecidos)

- server.js não existe (arquivo principal faltando)
- Diretório public/ está vazio (sem frontend)
- Repositório git corrompido
- Sem testes automatizados

---

## [0.0.0] - Início do Projeto

### Added

- Criação do projeto "bingo-client-server"
- Configuração inicial de dependências npm

---

## Versões Futuras (Planejadas)

### [1.1.0] - Planned
- Implementação completa do server.js
- Frontend web responsivo
- Sistema de autenticação funcional
- QR codes dinâmicos

### [1.2.0] - Planned
- Sistema de cartelas de bingo
- Validação automática de bingo
- Anúncios de voz (TTS)

### [2.0.0] - Planned
- Reescrita do frontend em framework moderno
- PWA com service worker
- Chat em tempo real
- Sistema de ranking
