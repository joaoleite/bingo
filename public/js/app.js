// ============================================
// BINGO CLIENT APPLICATION
// ============================================

class BingoApp {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.isAdmin = false;
    this.adminPassword = '';
    this.rooms = {};

    this.initElements();
    this.initSocket();
    this.bindEvents();
    this.loadRooms();
  }

  initElements() {
    // Seções
    this.roomSelection = document.getElementById('room-selection');
    this.gameArea = document.getElementById('game-area');
    this.adminPanel = document.getElementById('admin-panel');

    // Room selection
    this.roomGrid = document.getElementById('room-grid');

    // Game area
    this.btnBack = document.getElementById('btn-back');
    this.currentRoomName = document.getElementById('current-room-name');
    this.drawnCount = document.getElementById('drawn-count');
    this.bingoGrid = document.getElementById('bingo-grid');
    this.currentNumberEl = document.getElementById('current-number');
    this.currentNumberDisplay = document.getElementById('current-number-display');
    this.numbersGrid = document.getElementById('numbers-grid');

    // Connection status
    this.connectionStatus = document.getElementById('connection-status');

    // Admin
    this.adminLogin = document.getElementById('admin-login');
    this.adminPasswordInput = document.getElementById('admin-password');
    this.btnLogin = document.getElementById('btn-login');
    this.adminControls = document.getElementById('admin-controls');
    this.adminRoomSelect = document.getElementById('admin-room-select');
    this.btnDraw = document.getElementById('btn-draw');
    this.btnReset = document.getElementById('btn-reset');
    this.showAllToggle = document.getElementById('show-all-toggle');
  }

  initSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
    });

    this.socket.on('connected', (data) => {
      console.log('Conectado:', data);
    });

    this.socket.on('room-state', (room) => {
      this.renderRoomState(room);
    });

    this.socket.on('number-drawn', (data) => {
      this.handleNumberDrawn(data);
    });

    this.socket.on('room-reset', (data) => {
      this.handleRoomReset(data);
    });

    this.socket.on('room-updated', (data) => {
      this.updateRoomCard(data);
    });

    this.socket.on('show-mode-changed', (data) => {
      if (data.room === this.currentRoom) {
        this.renderShowMode(data.isShowingAll);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Erro:', error);
      alert(`Erro: ${error.message}`);
    });
  }

  bindEvents() {
    // Navegação
    this.btnBack.addEventListener('click', () => this.showRoomSelection());

    // Admin login
    this.btnLogin.addEventListener('click', () => this.adminLogin());
    this.adminPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.adminLogin();
    });

    // Admin controls
    this.btnDraw.addEventListener('click', () => this.adminDraw());
    this.btnReset.addEventListener('click', () => this.adminReset());
    this.adminRoomSelect.addEventListener('change', () => this.loadAdminRoom());
    this.showAllToggle.addEventListener('change', () => this.toggleShowAll());

    // Admin panel toggle
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        this.showAdminPanel();
      }
    });
  }

  updateConnectionStatus(connected) {
    const status = this.connectionStatus;
    if (connected) {
      status.classList.remove('disconnected');
      status.classList.add('connected');
      status.querySelector('.status-text').textContent = 'Conectado';
    } else {
      status.classList.remove('connected');
      status.classList.add('disconnected');
      status.querySelector('.status-text').textContent = 'Desconectado';
    }
  }

  async loadRooms() {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      this.rooms = {};
      data.rooms.forEach(room => {
        this.rooms[room.name] = room;
      });
      this.renderRoomGrid();
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
    }
  }

  renderRoomGrid() {
    this.roomGrid.innerHTML = '';
    const roomNames = Object.keys(this.rooms);

    if (roomNames.length === 0) {
      this.roomGrid.innerHTML = '<p class="no-rooms">Nenhuma sala disponível</p>';
      return;
    }

    roomNames.forEach(name => {
      const room = this.rooms[name];
      const card = document.createElement('div');
      card.className = 'room-card';
      card.innerHTML = `
        <h3>${name}</h3>
        <div class="stats">
          ${room.totalDrawn} sorteados • ${room.remaining} restantes
        </div>
        <span class="status-badge ${room.status}">${this.getStatusText(room.status)}</span>
      `;
      card.addEventListener('click', () => this.selectRoom(name));
      this.roomGrid.appendChild(card);
    });
  }

  getStatusText(status) {
    const texts = {
      waiting: 'Aguardando',
      active: 'Em jogo',
      completed: 'Completo'
    };
    return texts[status] || status;
  }

  updateRoomCard(data) {
    if (this.rooms[data.name]) {
      this.rooms[data.name].currentNumber = data.currentNumber;
      this.rooms[data.name].drawnNumbers = data.drawnNumbers;
      this.rooms[data.name].totalDrawn = data.totalDrawn;
      this.rooms[data.name].remaining = data.remaining;
      this.rooms[data.name].status = data.totalDrawn === 0 ? 'waiting'
        : data.totalDrawn >= 75 ? 'completed'
        : 'active';
      this.renderRoomGrid();
    }
  }

  selectRoom(roomName) {
    this.currentRoom = roomName;
    this.socket.emit('join-room', { roomName });

    this.roomSelection.classList.add('hidden');
    this.adminPanel.classList.add('hidden');
    this.gameArea.classList.remove('hidden');

    this.currentRoomName.textContent = roomName;
    this.renderBingoGrid();
  }

  showRoomSelection() {
    this.currentRoom = null;
    this.socket.emit('leave-room', { roomName: this.currentRoom });

    this.gameArea.classList.add('hidden');
    this.adminPanel.classList.add('hidden');
    this.roomSelection.classList.remove('hidden');

    this.loadRooms();
  }

  renderBingoGrid() {
    // Bingo 5x5: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
    const columns = [
      { letter: 'B', min: 1, max: 15 },
      { letter: 'I', min: 16, max: 30 },
      { letter: 'N', min: 31, max: 45 },
      { letter: 'G', min: 46, max: 60 },
      { letter: 'O', min: 61, max: 75 }
    ];

    this.bingoGrid.innerHTML = '';

    for (let i = 0; i < 25; i++) {
      const col = columns[i % 5];
      const num = i === 12 ? '★' : col.min + Math.floor(i / 5);
      const cell = document.createElement('div');
      cell.className = 'bingo-cell';
      cell.dataset.number = typeof num === 'number' ? num : '';
      cell.textContent = num;
      this.bingoGrid.appendChild(cell);
    }
  }

  renderRoomState(room) {
    this.currentRoomName.textContent = room.name;
    this.drawnCount.textContent = room.totalDrawn;

    // Atualizar número atual
    if (room.currentNumber) {
      this.currentNumberEl.textContent = room.currentNumber;
      this.highlightBingoCell(room.currentNumber);
    } else {
      this.currentNumberEl.textContent = '-';
    }

    // Renderizar números sorteados
    this.renderDrawnNumbers(room.drawnNumbers);

    // Atualizar grid
    this.updateBingoGrid(room.drawnNumbers, room.isShowingAll);
  }

  handleNumberDrawn(data) {
    if (data.room !== this.currentRoom) return;

    this.drawnCount.textContent = data.totalDrawn;
    this.currentNumberEl.textContent = data.number;

    // Highlight animation
    this.highlightCurrentNumber(data.number);
    this.highlightBingoCell(data.number);
    this.addDrawnNumber(data.number);

    // Adicionar ao grid
    const cell = this.bingoGrid.querySelector(`[data-number="${data.number}"]`);
    if (cell) {
      cell.classList.add('drawn', 'highlight');
    }
  }

  highlightCurrentNumber(number) {
    this.currentNumberDisplay.classList.add('highlight-animate');
    setTimeout(() => {
      this.currentNumberDisplay.classList.remove('highlight-animate');
    }, 500);
  }

  highlightBingoCell(number) {
    const cell = this.bingoGrid.querySelector(`[data-number="${number}"]`);
    if (cell) {
      cell.classList.add('drawn', 'highlight');
      setTimeout(() => cell.classList.remove('highlight'), 500);
    }
  }

  renderDrawnNumbers(numbers) {
    this.numbersGrid.innerHTML = '';
    numbers.forEach(num => this.addDrawnNumber(num));
  }

  addDrawnNumber(number) {
    const item = document.createElement('div');
    item.className = 'number-item';
    item.textContent = number;
    this.numbersGrid.appendChild(item);
  }

  updateBingoGrid(drawnNumbers, isShowingAll) {
    const cells = this.bingoGrid.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
      const num = cell.dataset.number;
      if (num && drawnNumbers.includes(parseInt(num))) {
        cell.classList.add('drawn');
      } else {
        cell.classList.remove('drawn');
      }
    });

    this.renderShowMode(isShowingAll);
  }

  renderShowMode(isShowingAll) {
    // Se não mostrar todos, destacar apenas o último
    const drawnNumbers = this.rooms[this.currentRoom]?.drawnNumbers || [];
    const lastNumber = drawnNumbers[drawnNumbers.length - 1];

    if (!isShowingAll && lastNumber) {
      const cells = this.bingoGrid.querySelectorAll('.bingo-cell');
      cells.forEach(cell => {
        const num = cell.dataset.number;
        if (num && parseInt(num) !== lastNumber) {
          cell.classList.remove('drawn');
        }
      });
    }
  }

  handleRoomReset(data) {
    if (data.room !== this.currentRoom) return;

    this.currentNumberEl.textContent = '-';
    this.drawnCount.textContent = '0';
    this.numbersGrid.innerHTML = '';

    const cells = this.bingoGrid.querySelectorAll('.bingo-cell');
    cells.forEach(cell => cell.classList.remove('drawn'));
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  showAdminPanel() {
    this.roomSelection.classList.add('hidden');
    this.gameArea.classList.add('hidden');
    this.adminPanel.classList.remove('hidden');

    if (!this.isAdmin) {
      this.adminLogin.classList.remove('hidden');
      this.adminControls.classList.add('hidden');
    }

    this.updateAdminRoomSelect();
  }

  updateAdminRoomSelect() {
    this.adminRoomSelect.innerHTML = '';
    Object.keys(this.rooms).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      this.adminRoomSelect.appendChild(option);
    });
  }

  async adminLogin() {
    const password = this.adminPasswordInput.value;
    if (!password) {
      alert('Digite a senha');
      return;
    }

    // Testar autenticação fazendo uma requisição
    try {
      const response = await fetch('/api/rooms/public', {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:' + password)
        }
      });

      if (response.ok) {
        this.isAdmin = true;
        this.adminPassword = password;
        this.adminLogin.classList.add('hidden');
        this.adminControls.classList.remove('hidden');
        this.loadAdminRoom();
      } else {
        alert('Senha incorreta');
      }
    } catch (error) {
      alert('Erro ao autenticar');
    }
  }

  async loadAdminRoom() {
    const roomName = this.adminRoomSelect.value;
    try {
      const response = await fetch(`/api/rooms/${roomName}`);
      const room = await response.json();
      this.rooms[roomName] = room;
      this.showAllToggle.checked = room.isShowingAll;
    } catch (error) {
      console.error('Erro ao carregar sala:', error);
    }
  }

  async adminDraw() {
    const roomName = this.adminRoomSelect.value;
    try {
      const response = await fetch(`/api/rooms/${roomName}/draw`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:' + this.adminPassword)
        }
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao sortear:', error);
    }
  }

  async adminReset() {
    const roomName = this.adminRoomSelect.value;
    if (!confirm(`Resetar sala ${roomName}?`)) return;

    try {
      const response = await fetch(`/api/rooms/${roomName}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:' + this.adminPassword)
        }
      });

      const data = await response.json();
      if (data.success) {
        this.loadAdminRoom();
      }
    } catch (error) {
      console.error('Erro ao resetar:', error);
    }
  }

  async toggleShowAll() {
    const roomName = this.adminRoomSelect.value;
    const show = this.showAllToggle.checked;
    const endpoint = show ? 'show-all' : 'show-last';

    try {
      await fetch(`/api/rooms/${roomName}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:' + this.adminPassword)
        }
      });
    } catch (error) {
      console.error('Erro ao alterar modo:', error);
    }
  }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.bingoApp = new BingoApp();
});
