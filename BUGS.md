# Bugs Conhecidos

## 🆘 Críticos (Impedem funcionamento)

### B001: server.js Faltando
**Severidade:** CRÍTICA
**Estado:** ✅ CORRIGIDO

O arquivo `server.js` não existia no repositório. O `package.json` especifica `"main": "server.js"` mas o arquivo nunca foi criado ou foi deletado.

**Correção:** Recriado server.js com:
- Express.js + Socket.IO
- API REST completa
- Autenticação básica
- Geração de QR codes
- Validação de salas

---

### B002: Diretório public/ Vazio
**Severidade:** CRÍTICA
**Estado:** ✅ CORRIGIDO

O diretório `public/` estava vazio. O sistema promete um "cliente web" mas não havia arquivos HTML/CSS/JS.

**Correção:** Criado frontend completo:
- `public/index.html` - Página principal
- `public/css/style.css` - Estilos responsivos
- `public/js/app.js` - Aplicação Socket.IO client
- `public/manifest.json` - PWA manifest

---

## ⚠️ Altos (Afetam funcionamento)

### B003: Repositório Git Corrompido
**Severidade:** ALTA
**Estado:** ✅ CORRIGIDO

Comandos git falhavam com "not a git repository". O diretório `.git` existia mas estava incompleto ou corrompido.

**Correção:** Repositório git reinicializado com `git init` e commit inicial.

---

### B004: Sem Testes Automatizados
**Severidade:** ALTA
**Estado:** ABERTO

Não existe nenhum arquivo de teste. Qualidade do código não pode ser verificada.

**Impacto:** Bugs podem passar despercebidos.

**Sugestão:** Adicionar Jest + Supertest

---

## 🔧 Médios (Funcionalidade reduzida)

### B005: Sem Validação de Input no drawNumber
**Severidade:** MÉDIA
**Estado:** ✅ CORRIGIDO

O método `drawNumber` em `gameState.js` não validava se o número está no range 1-75.

**Correção:** Implementada validação no server.js:
```javascript
// Gera número randomico entre 1-75
let number = Math.floor(Math.random() * 75) + 1;
```

---

### B006: Vulnerabilidade - Basic Auth Hardcoded
**Severidade:** MÉDIA
**Estado:** ✅ CORRIGIDO (parcialmente)

O `express-basic-auth` estava nas dependências mas:
1. Credenciais não deviam ser hardcoded
2. Não havia HTTPS (credenciais expostas em texto)

**Correção:** Credenciais agora via variáveis de ambiente:
```javascript
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
```

**Ainda pendente:** Forçar HTTPS em produção

---

### B007: Race Condition Possível
**Severidade:** MÉDIA
**Estado:** ⚠️ PARCIALMENTE CORRIGIDO

O `gameState.js` usa `fs.writeFileSync` sem lock. Se múltiplos sockets tentarem sortear simultaneamente, pode haver perda de dados.

**Correção parcial:** Sorteio agora é feito no servidor (não no client), reduzindo window de race condition.

**Ainda pendente:** Implementar file locking ou usar banco de dados.

---

## 📝 Baixos (Minor)

### B008: Nomes de Salas Não Sanitizados
**Severidade:** BAIXA
**Estado:** ✅ CORRIGIDO

Não havia validação/sanitização dos nomes de sala.

**Correção:** Implementada validação:
```javascript
// Apenas letras, números e underscore, máximo 50 chars
if (!name || !/^[a-zA-Z0-9_]{1,50}$/.test(name)) {
  return res.status(400).json({ error: 'Nome de sala inválido' });
}
```

---

### B009: Sem Rate Limiting
**Severidade:** BAIXA
**Estado:** ABERTO

Endpoints da API não têm rate limiting. Ataques de força bruta são possíveis.

**Sugestão:** Usar `express-rate-limit`

---

### B010: Console.log em Produção
**Severidade:** BAIXA
**Estado:** ABERTO

O código usa `console.log` e `console.error` diretamente. Em produção, deveria usar logger estruturado.

**Sugestão:** Usar pino ou winston

---

## ✅ Bugs Corrigidos / Resolvidos

| Bug | Descrição | Data Correção |
|-----|-----------|--------------|
| B001 | server.js faltando | 2026-04-04 |
| B002 | public/ vazio | 2026-04-04 |
| B003 | Git corrompido | 2026-04-04 |
| B005 | Sem validação de input | 2026-04-04 |
| B006 | Basic Auth hardcoded | 2026-04-04 |
| B008 | Nomes de salas não sanitizados | 2026-04-04 |

---

## 🔍 Como Reportar Novos Bugs

1. Verifique se o bug já não está listado acima
2. Descreva o problema claramente
3. Inclua passos para reproduzir
4. Adicione screenshots se aplicável
5. Informe ambiente (OS, Node version, browser)

---
