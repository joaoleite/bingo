const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'game-state.json');

class GameState {
    constructor() {
        this.state = {
            currentNumber: null,
            drawnNumbers: [],
            isShowingAll: false
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                this.state = JSON.parse(data);
                console.log('Estado do jogo carregado do arquivo.');
            }
        } catch (error) {
            console.error('Erro ao carregar estado:', error);
        }
    }

    save() {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Erro ao salvar estado:', error);
        }
    }

    get() {
        return this.state;
    }

    drawNumber(number) {
        if (this.state.drawnNumbers.includes(number)) {
            throw new Error('Número já foi sorteado');
        }

        this.state.currentNumber = number;
        this.state.drawnNumbers.push(number);
        this.state.isShowingAll = false;
        this.save();
        return this.state;
    }

    reset() {
        this.state = {
            currentNumber: null,
            drawnNumbers: [],
            isShowingAll: false
        };
        this.save();
        return this.state;
    }

    setShowAll(show) {
        this.state.isShowingAll = show;
        this.save();
        return this.state;
    }

    setShowLast() {
        this.state.isShowingAll = false;
        this.save();
        return this.state;
    }
}

module.exports = new GameState();
