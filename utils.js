const NUMBERS = [1, 2, 3, 4, 5]
const CARDS_PER_NUMBER = [3, 2, 2, 2, 1]
const COLORS = ['blue', 'yellow', 'red', 'green', 'white']

class Card {
    constructor(number, color, id) {
        this.number = number
        this.color = color
        this.id = id
    }

    getNumber = () => this.number
    getColor = () => this.color
}

class Deck {
    constructor() {
        this.cards = []
        for (let color of COLORS) {
            for (let number of NUMBERS) {
                for (let quantity = 0; quantity < CARDS_PER_NUMBER[number-1]; quantity++) {
                    this.cards.push(new Card(number, color, this.cards.length))
                }
            }
        }

        this.shuffle()
    }

    shuffle() {
        this.cards = this.cards
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)
    }

    drawCard() {
        if (this.cards.length > 0) {
            return this.cards.pop()
        } else {
            return null
        }
    }
}

class Player {
    constructor(username, id) {
        this.name = username
        this.cards = []
        this.id = id
        this.disconnected = false
    }

    getId = () => this.id
    getName = () => this.name

    addCard(card) {
        this.cards.push(card)
    }

    getCard(index) {
        return this.cards[index]
    }

    replaceCard(index, newCard) {
        if (newCard !== null) {
            this.cards.splice(index, 1, newCard)
        } else {
            this.cards.splice(index, 1)
        }
        
    }
}

class Table {
    constructor() {
        this.cards = {}
        this.discards = {}
        for (let color of COLORS) {
            this.cards[color] = []
            this.discards[color] = {}
            for (let number of NUMBERS) {
                this.discards[color][number] = []
            }
        }
        
        this.lastCardMoved = null
    }

    // Removes the lastMoved from the previous card and sets it for the new one
    setLastCardMoved(card) {
        this.lastCardMoved = card.id
    }

    // Returns the state of the game -> 1:WIN ; 0:NOTHING ; -1:LOSE
    isFinished() {
        let result = 1;
        for (let color of COLORS) {
            for (let number of NUMBERS) {
                if (this.discards[color][number].length == CARDS_PER_NUMBER[number-1]) {
                    return -1
                }
            }

            if (this.cards[color].length < 5) {
                result = 0
            }
        }
        return result
    }

    // Tries to place a card: 0: OK, -1: FAIL, 1: OK AND COLOR COMPLETE
    placeCard(card) {
        if (card.getNumber() == 1 && this.cards[card.getColor()].length == 0) {
            this.setLastCardMoved(card)
            this.cards[card.getColor()].push(card)
            return 0
        } else if (this.cards[card.getColor()].length == 0) {
            return -1
        } else if (this.cards[card.getColor()].slice(-1)[0].getNumber() == card.getNumber()-1) {
            this.setLastCardMoved(card)
            this.cards[card.getColor()].push(card)
            return card.getNumber() == 5 ? 1 : 0
        } else {
            return -1
        }
    }

    addDiscard(card) {
        this.setLastCardMoved(card)
        this.discards[card.getColor()][card.getNumber()].push(card)
    }
}

class Game {
    constructor() {
        this.players = []
        this.running = false
        this.deck = new Deck()
        this.table = new Table()
        this.lifes = 3
        this.hints = 8
        this.currentPlayer = 0 // Randomize?
        this.numPlayers = 0
    }

    isRunning = () => this.running
    getNumPlayers = () => this.numPlayers
    getCurrentPlayerId = () => this.players[this.currentPlayer].getId()
    getCurrentPlayerName = () => this.players[this.currentPlayer].getName()

    isFinished() { // 1:WIN ; 0:NOTHING ; -1:LOSE
        if (this.lifes <= 0) {
            this.running = false
            return -1
        } else {
            let result = this.table.isFinished()
            if (result != 0) {
                this.running = false
            }
            return result
        }
    }

    addPlayer(username, id) {
        this.players.push(new Player(username, id))
        this.numPlayers++
    }

    removePlayer(username) {
        const index = this.players.findIndex(player => player.name === username)
        if (index !== -1) {
            this.players.splice(index, 1)
            this.numPlayers--
        }
    }

    initialize() {
        this.running = true

        if (this.players.length <= 3) {
            // Deals 5 cards for each player
            for (let player of this.players) {
                for (let i=0; i < 5; i++) {
                    player.addCard(this.deck.drawCard())
                }
            }

        } else {
            // Deals 4 cards for each player
            for (let player of this.players) {
                for (let i=0; i < 4; i++) {
                    player.addCard(this.deck.drawCard())
                }
            }
        }
    }

    restartGame() {
        for (let player of this.players) {
            player.cards = []
        }
        this.deck = new Deck()
        this.table = new Table()
        this.lifes = 3
        this.hints = 8
        this.currentPlayer = 0
        this.numPlayers = this.players.length
    }

    useHint() {
        if (this.hints > 0) {
            this.hints--
            this.nextPlayer()
        }
    }

    addHints(quantity) {
        this.hints += quantity
        if (this.hints > 8) {
            this.hints = 8
        }
    }

    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers
        if (this.players[this.currentPlayer].cards.length <= 0 && this.isFinished() == 0) {
            this.nextPlayer()
        }
    }

    placeCard(cardId) {
        let card = this.players[this.currentPlayer].getCard(cardId)
        let result = this.table.placeCard(card)
        if (result == -1) { // No se puede colocar, restar vida
            this.lifes--
        } else if (result == 0) { // Se puede completar
            this.players[this.currentPlayer].replaceCard(cardId, this.deck.drawCard())
            this.nextPlayer()
        } else if (result == 1) { // Se puede colocar y además completa color
            this.players[this.currentPlayer].replaceCard(cardId, this.deck.drawCard())
            this.nextPlayer()
            this.addHints(2)
        }
    }

    discardCard(cardId) {
        let card = this.players[this.currentPlayer].getCard(cardId)
        this.table.addDiscard(card)
        this.players[this.currentPlayer].replaceCard(cardId, this.deck.drawCard())
        this.addHints(1)
        this.nextPlayer()
    }
}

module.exports = { Game, NUMBERS }