const NUMBERS = [1, 2, 3, 4, 5]
const CARDS_PER_NUMBER = [3, 2, 2, 2, 1]
const COLORS = ['blue', 'yellow', 'red', 'green', 'white']

class Card {
    constructor(number, color) {
        this.number = number
        this.color = color
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
                    this.cards.push(new Card(number, color))
                }
            }
        }

        this.shuffle()
    }

    shuffle() {
        // Should mix this.cards[]
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

    // Tries to place a card, if not possible return false and adds it to discards[]
    placeCard(card) {
        if (card.getNumber() == 1 && this.cards[card.getColor()].length == 0) {
            this.cards[card.getColor()].push(card)
            return 0
        } else if (this.cards[card.getColor()].length == 0) {
            return -1
        } else if (this.cards[card.getColor()].slice(-1)[0].getNumber() == card.getNumber()-1) {
            this.cards[card.getColor()].push(card)
            return card.getNumber() == 5 ? 1 : 0
        } else {
            return -1
        }
    }

    addDiscard(card) {
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
        this.hints--
        this.nextPlayer()
    }

    addHints(quantity) {
        this.hints += quantity
        if (this.hints > 8) {
            this.hints = 8
        }
    }

    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers
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

module.exports = { Game }