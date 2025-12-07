const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'game-state.json');

class GameState {
    constructor() {
        this.rooms = {}; // { roomName: { currentNumber, drawnNumbers, isShowingAll } }
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                this.rooms = JSON.parse(data);
                console.log('Estados dos jogos carregados do arquivo.');
            }
        } catch (error) {
            console.error('Erro ao carregar estado:', error);
            this.rooms = {};
        }
    }

    save() {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.rooms, null, 2));
        } catch (error) {
            console.error('Erro ao salvar estado:', error);
        }
    }

    // Helper to get or create room state
    _getRoomState(roomName) {
        if (!roomName) roomName = 'public'; // Default room

        if (!this.rooms[roomName]) {
            this.rooms[roomName] = {
                currentNumber: null,
                drawnNumbers: [],
                isShowingAll: false,
                voicePreference: 'default', // Preferred voice name pattern
                lastActivity: Date.now()
            };
        }
        return this.rooms[roomName];
    }

    setVoicePreference(roomName, voiceName) {
        const state = this.get(roomName);
        state.voicePreference = voiceName;
        this.save();
        return state;
    }

    get(roomName) {
        return this._getRoomState(roomName);
    }

    drawNumber(roomName, number) {
        const state = this._getRoomState(roomName);

        if (state.drawnNumbers.includes(number)) {
            throw new Error('Número já foi sorteado nesta sala');
        }

        state.currentNumber = number;
        state.drawnNumbers.push(number);
        state.isShowingAll = false;
        state.lastActivity = Date.now();

        this.save();
        return state;
    }

    reset(roomName) {
        const state = this._getRoomState(roomName);

        state.currentNumber = null;
        state.drawnNumbers = [];
        state.isShowingAll = false;
        state.lastActivity = Date.now();

        this.save();
        return state;
    }

    setShowAll(roomName, show) {
        const state = this._getRoomState(roomName);
        state.isShowingAll = show;
        this.save();
        return state;
    }

    toggleDisplayMode(roomName, mode) {
        const state = this._getRoomState(roomName);
        if (mode === 'all') {
            state.isShowingAll = true;
        } else if (mode === 'current') {
            state.isShowingAll = false;
        } else {
            // Toggle if no explicit mode
            state.isShowingAll = !state.isShowingAll;
        }
        this.save();
        return state;
    }

    setShowLast(roomName) {
        const state = this._getRoomState(roomName);
        state.isShowingAll = false;
        this.save();
        return state;
    }
}

module.exports = new GameState();
