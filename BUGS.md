# Bugs Conhecidos

## 🆘 Críticos (Impedem funcionamento)

### B001: server.js Faltando
**Severidade:** CRÍTICA
**Estado:** ABERTO

O arquivo `server.js` não existe no repositório. O `package.json` especifica `"main": "server.js"` mas o arquivo nunca foi criado ou foi deletado.

**Impacto:** Sistema não inicia.

**Solução necessária:** Recriar o server.js do zero.

---

### B002: Diretório public/ Vazio
**Severidade:** CRÍTICA
**Estado:** ABERTO

O diretório `public/` está vazio. O sistema promete um "cliente web" mas não há arquivos HTML/CSS/JS.

**Impacto:** Sem interface para usuários.

**Solução necessária:** Criar frontend web.

---

## ⚠️ Altos (Afetam funcionamento)

### B003: Repositório Git Corrompido
**Severidade:** ALTA
**Estado:** ABERTO

Comandos git falham com "not a git repository". O diretório `.git` existe mas está incompleto ou corrompido.

**Sintomas:**
```
fatal: not a git repository (or any parent up to mount point)
```

**Impacto:** Sem controle de versão, histórico de commits inacessível.

**Possível causa:** Clone incompleto ou .git/config corrompido.

---

### B004: Sem Testes Automatizados
**Severidade:** ALTA
**Estado:** ABERTO

Não existe nenhum arquivo de teste. Qualidade do código não pode ser verificada.

**Impacto:** Bugs podem passar despercebidos.

---

## 🔧 Médios (Funcionalidade reduzida)

### B005: Sem Validação de Input no drawNumber
**Severidade:** MÉDIA
**Estado:** ABERTO (presumido)

O método `drawNumber` em `gameState.js` não valida se o número está no range 1-75.

```javascript
// Linha 60-65 de gameState.js
drawNumber(roomName, number) {
    const state = this._getRoomState(roomName);
    if (state.drawnNumbers.includes(number)) {
        throw new Error('Número já foi sorteado nesta sala');
    }
    // Falta: validar range de number (1-75)
```

**Impacto:** Números inválidos podem ser aceitos.

---

### B006: Vulnerabilidade - Basic Auth Hardcoded
**Severidade:** MÉDIA
**Estado:** ABERTO

O `express-basic-auth` está nas dependências mas:
1. Credenciais não devem ser hardcoded
2. Não há HTTPS (credenciais expostas em texto)

**Impacto:** Segurança comprometida se exposto na internet.

---

### B007: Race Condition Possível
**Severidade:** MÉDIA
**Estado:** ABERTO

O `gameState.js` usa `fs.writeFileSync` sem lock. Se múltiplos sockets tentarem sortear simultaneamente, pode haver perda de dados.

```javascript
// Linha 27 de gameState.js
fs.writeFileSync(STATE_FILE, JSON.stringify(this.rooms, null, 2));
```

**Impacto:** Estado pode ser sobrescrito em situações de alta concorrência.

---

## 📝 Baixos (Minor)

### B008: Nomes de Salas Não Sanitizados
**Severidade:** BAIXA
**Estado:** ABERTO

Não há validação/sanitização dos nomes de sala. Caracteres especiais podem causar problemas.

---

### B009: Sem Rate Limiting
**Severidade:** BAIXA
**Estado:** ABERTO

Endpoints da API não têm rate limiting. Ataques de força bruta são possíveis.

---

### B010: Console.log em Produção
**Severidade:** BAIXA
**Estado:** ABERTO

O código usa `console.log` e `console.error` diretamente. Em produção, deveria usar logger estruturado.

```javascript
// gameState.js linha 17
console.log('Estados dos jogos carregados do arquivo.');
```

---

## ✅ Bugs Corrigidos / Resolvidos

*Nenhum registrado ainda.*

---

## 🔍 Como Reportar Novos Bugs

1. Verifique se o bug já não está listado acima
2. Descreva o problema claramente
3. Inclua passos para reproduzir
4. Adicione screenshots se aplicável
5. Informe ambiente (OS, Node version, browser)

---
