# Guia de Contribuição

Obrigado por contribuir com o Bingo Client-Server! Este documento fornece diretrizes para contribuir.

## Como Contribuir

### 1. Reportar Bugs

Antes de reportar:
- Verifique se o bug já foi reportado em [BUGS.md](./BUGS.md)
- Use o template abaixo:

```markdown
## Descrição
[Descrição clara do bug]

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. See erro

## Comportamento Esperado
[O que você esperava que acontecesse]

## Screenshots
[Se aplicável]

## Ambiente
- OS: [e.g., macOS 14.0]
- Node: [e.g., v20.10.0]
- Browser: [e.g., Chrome 119]
```

### 2. Solicitar Funcionalidades

Solicitações são bem-vindas! Use o template:

```markdown
## Funcionalidade
[Descrição da funcionalidade]

## Motivação
[Por que você precisa desta funcionalidade?]

## Alternativas Consideredas
[Outras soluções consideradas]
```

### 3. Pull Requests

#### Processo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

#### Requisitos

- [ ] Código segue o estilo do projeto (ESLint)
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Commits são descritivos

## Padrões de Código

### JavaScript

```javascript
// ✅ Bom
async function drawNumber(roomName) {
  const room = await getRoom(roomName);
  return room.draw();
}

// ❌ Ruim
function drawNumber(roomName) {
  var room = getRoom(roomName);
  return room.draw();
}
```

### Nomes

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Variáveis | camelCase | `drawnNumbers` |
| Constantes | UPPER_SNAKE | `MAX_PLAYERS` |
| Funções | camelCase | `drawNumber()` |
| Classes | PascalCase | `GameState` |
| Arquivos | kebab-case | `game-state.js` |

### Commits

Formato: `<tipo>(<escopo>): <descrição>`

Tipos:
- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Documentação
- `style` - Formatação
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Tarefas gerais

Exemplos:
```
feat(room): add QR code generation
fix(draw): prevent duplicate numbers
docs(api): add endpoint documentation
```

## Estrutura de Arquivos

```
bingoplay/
├── public/           # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── server.js         # Entry point
├── gameState.js      # Game state module
├── game-state.json   # Persisted data
├── package.json
├── TODO.md
├── BUGS.md
├── ARCHITECTURE.md
├── API.md
└── CONTRIBUTING.md
```

## Testes

```bash
# Rodar todos os testes
npm test

# Rodar testes com coverage
npm run test:coverage

# Rodar em watch mode
npm run test:watch
```

### Cobertura Mínima

- gameState.js: 80%
- API endpoints: 70%

## Dúvidas?

- Abra uma issue
- Envie email para [a definir]

---

**Lembre-se:** Todas as contribuições são apreciadas! 🎉
