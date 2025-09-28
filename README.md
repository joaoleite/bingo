# Sistema de Bingo - Cliente/Servidor

Sistema completo de Bingo com interface web para controle e exibição em tempo real.

## 🚀 Funcionalidades

- **Controle Manual**: Interface para inserir números sorteados
- **Display em Tempo Real**: Tela de exibição que atualiza automaticamente
- **Comunicação WebSocket**: Atualizações instantâneas para todos os clientes
- **Modo Tela Cheia**: Display otimizado para projeção
- **Histórico Completo**: Visualização de todos os números sorteados

## 📋 Como usar

### 1. Instalação
```bash
npm install
```

### 2. Executar o servidor
```bash
npm start
```

### 3. Acessar o sistema
- **Menu Principal**: http://localhost:3000
- **Interface de Controle**: http://localhost:3000/admin.html
- **Display de Exibição**: http://localhost:3000/display.html

## 🎮 Instruções de Uso

1. **Abra o Controle** (`admin.html`) em um dispositivo para inserir os números
2. **Abra o Display** (`display.html`) na tela que será mostrada ao público
3. **Digite os números** sorteados no controle - eles aparecerão automaticamente no display
4. **Use "Mostrar Todos"** para exibir uma grade com todos os números sorteados
5. **Use "Reiniciar"** para começar um novo jogo

## ⌨️ Atalhos

- **F11 ou Ctrl+F**: Ativar/desativar tela cheia no display
- **Enter**: Confirmar número no controle

## 🔧 API Endpoints

- `GET /api/status` - Status atual do jogo
- `POST /api/draw-number` - Sortear novo número
- `POST /api/show-all` - Mostrar todos os números
- `POST /api/reset` - Reiniciar jogo

## 🎯 Recursos Técnicos

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Comunicação**: WebSocket para tempo real
- **Design**: Responsivo e otimizado para projeção

## 📱 Compatibilidade

- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Dispositivos móveis e desktop
- Modo tela cheia para projeções