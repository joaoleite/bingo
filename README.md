# Sistema de Bingo - Cliente/Servidor

Sistema completo de Bingo com interface web real-time, controle de acesso e persistência de dados.

## 🚀 Funcionalidades

- **Controle Seguro**: Painel administrativo protegido por senha.
- **Display em Tempo Real**: Atualização instantânea via WebSockets.
- **Persistência**: O jogo salva o estado automaticamente (não perde dados se o servidor reiniciar).
- **QR Codes**: Geração automática de QR Codes para fácil acesso via celular.
- **Docker Ready**: Pronto para deploy no Coolify ou qualquer ambiente Docker.

## 📋 Como usar (Local)

### 1. Instalação
```bash
npm install
```

### 2. Configuração (Opcional)
Você pode definir a senha de admin via variável de ambiente (padrão: `bingo2024`):
```bash
export ADMIN_PASSWORD="sua_senha_segura"
```

### 3. Executar
```bash
npm start
```

### 4. Acessar
- **Display (Público)**: http://localhost:3000/display.html
- **Admin (Privado)**: http://localhost:3000/admin.html
  - **Usuário**: `admin`
  - **Senha**: `bingo2024` (ou a definida no passo 2)

## 🐳 Como rodar com Docker

Ideal para deploy no **Coolify**.

```bash
# Construir a imagem
docker build -t bingo-server .

# Rodar o container
docker run -p 3000:3000 -d bingo-server
```

## 🛠️ Tecnologias

- **Backend**: Node.js, Express, Socket.io
- **Segurança**: Express Basic Auth
- **Persistência**: JSON File Storage
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)

## 📱 Atalhos e Dicas

- **F11**: Tela cheia no display.
- **NoSleep**: O display mantém a tela do celular/tablet acesa automaticamente.