# TODO - Plano de Ação

## Fase 1: Recuperação do Projeto (Crítico)

### 1.1 Recriar server.js
- [ ] Criar servidor Express básico
- [ ] Configurar Socket.IO
- [ ] Implementar rotas da API REST
- [ ] Integrar com gameState.js
- [ ] Configurar autenticação básica
- [ ] Gerar QR Codes para cada sala
- [ ] Servir arquivos estáticos de public/

### 1.2 Criar Frontend Web
- [ ] Criar index.html principal
- [ ] Implementar dashboard de salas
- [ ] Criar tela de jogo (exibição de números)
- [ ] Implementar conexão Socket.IO client
- [ ] Adicionar design responsivo (mobile-first)
- [ ] Criar tema escuro

### 1.3 Verificar Sistema
- [ ] Testar se npm start inicia corretamente
- [ ] Testar conexão WebSocket
- [ ] Testar sorteio de números
- [ ] Testar persistência de estado

---

## Fase 2: Funcionalidades Core

### 2.1 Sistema de Jogo
- [ ] Validar range de números (1-75)
- [ ] Implementar validação de números duplicados
- [ ] Adicionar delay entre sorteios (opcional)
- [ ] Som de notification ao sortear

### 2.2 Gerenciamento de Salas
- [ ] Criar sala via API
- [ ] Deletar sala via API
- [ ] Listar salas ativas/inativas
- [ ] Timeout para salas sem atividade (24h)

### 2.3 Autenticação Admin
- [ ] Proteger rotas de criação/reset
- [ ] Dashboard administrativo
- [ ] Log de ações admin

---

## Fase 3: Funcionalidades Avançadas

### 3.1 Cartelas de Bingo
- [ ] Gerar cartelas válidas (5x5, BINGO)
- [ ] Criar página para jogador gerar cartela
- [ ] Validar cartela automaticamente
- [ ] Detectar linha, diagonal, bingo

### 3.2 Sistema de Voz
- [ ] Integrar Web Speech API
- [ ] Anunciar números sorteados
- [ ] Permitir escolher voz preferida
- [ ] Configurar volume/velocidade

### 3.3 QR Codes
- [ ] Gerar QR codes únicos por sala
- [ ] Exibir QR code na sala
- [ ] Link direto para sala (ex: /sala/QA)

### 3.4 Modo Apresentação
- [ ] Tela cheia para público
- [ ] Exibição em tempo real
- [ ] Sem controles visíveis
- [ ] Altamente visível (números grandes)

### 3.5 Histórico e Estatísticas
- [ ] Salvar jogos anteriores
- [ ] Mostrar números mais sorteados
- [ ] Estátisticas por sala
- [ ] Tempo médio entre sorteios

---

## Fase 4: Correções e Melhorias

### 4.1 Validações
- [ ] Validar todos os inputs da API
- [ ] Tratar erros gracefulmente
- [ ] Adicionar rate limiting
- [ ] Sanitizar nomes de salas

### 4.2 Resiliência
- [ ] Tratar desconexões de clients
- [ ] Reconexão automática WebSocket
- [ ] Backup automático do estado
- [ ] Recovery de crashes

### 4.3 Performance
- [ ] Lazy loading de salas
- [ ] Comprimir responses
- [ ] Cache de QR codes
- [ ] Otimizar re-renders no frontend

---

## Fase 5: Qualidade de Código

### 5.1 Testes
- [ ] Setup Jest
- [ ] Testes unitários para gameState.js
- [ ] Testes de API (Supertest)
- [ ] Testes de WebSocket
- [ ] Testes E2E básicos

### 5.2 Linting
- [ ] Configurar ESLint
- [ ] Configurar Prettier
- [ ] Git hooks (pre-commit)

### 5.3 Documentação
- [ ] JSDoc para todas as funções
- [ ] README atualizado
- [ ] Documentar eventos WebSocket
- [ ] Documentar estrutura de dados

### 5.4 CI/CD
- [ ] GitHub Actions básico
- [ ] Rodar testes no PR
- [ ] Deploy script

---

## Fase 6: Infraestrutura

### 6.1 Docker
- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] .dockerignore

### 6.2 Monitoramento
- [ ] Logs estruturados
- [ ] Health check endpoint
- [ ] Métricas básicas

---

## Fase 7: Extras

- [ ] PWA - Service Worker + Manifest
- [ ] Chat em tempo real na sala
- [ ] Ranking de jogadores
- [ ] Modo competitivo (múltiplos jogos simultâneos)
- [ ] Exportar resultados em PDF
- [ ] Integração com Discord (webhooks)
