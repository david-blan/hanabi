const express = require('express');
const path = require('path');
const { Game } = require('./utils.js');
const cors = require('cors');
// const { program } = require('commander');
// const readline = require('readline');

const app = express();
app.use(cors())
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const PORT = 3000;

const NUMBERS = [1, 2, 3, 4, 5]


// // Definir el comando personalizado
// program
//   .command('saludar')
//   .description('Saluda desde la aplicación web')
//   .action(() => {
//     console.log('¡Hola desde la aplicación web!');
//   });

// // Crear una interfaz para leer comandos desde la línea de comandos
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// // Leer comandos desde la línea de comandos
// rl.on('line', (input) => {
//   const args = input.trim().split(' ');
//   program.parse(args);
// });


const generateGameInfo = (game) => {

    let userList = []
    for (let user of game.players) {
        
        let obj = {
            name: user.getName(),
            cards: user.cards,
            //numCards: user.cards.length,
            id: user.getId()
        }

        userList.push(obj)
    }

    let tableObj = {
        placed: {},
        discards: {}
    }

    for (let color of Object.keys(game.table.cards)) {
        if (game.table.cards[color].length > 0) {
            tableObj.placed[color] = game.table.cards[color]
        }

        for (let number of NUMBERS) {
            if (game.table.discards[color][number].length > 0) {
                if (tableObj.discards[color] == undefined) {
                    tableObj.discards[color] = []
                }
                for (let card of game.table.discards[color][number]) {
                    tableObj.discards[color].push(card)
                }
            }
        }
        // auxObj = {}
        // for (let number of NUMBERS) {
        //     if (game.table.discards[color][number].length > 0) {
        //         auxObj[number] = game.table.discards[color][number]
        //     }
        // }

        // if (Object.keys(auxObj).length > 0) {
        //     tableObj.discards[color] = auxObj
        // }
    }

    return {
        users: userList,
        table: tableObj,
        hints: game.hints,
        lifes: game.lifes,
        turn: (game.isRunning() ? game.getCurrentPlayerId() : -1)
    }
}


const extraFeatures = (object) => {
    // Object should have the form:
        // {name: 'dablan', type: 'alert', content: 'Hello World!'}
}


const lobby = () => {
    
    let game = new Game()

    // Escuchar conexiones de Socket.IO
    io.on('connection', function(socket) {
        socket.on('join-attempt', (name) => {
            const existing = game.players.find(player => player.name === name)
            if (existing) {
                socket.emit('name-exists')
            } else {
                game.addPlayer(name, socket.id)
                socket.emit('join-success', socket.id)
                io.emit('player-joined', game.players)
            }
        })

        socket.on('start-request', () => {
            if (!game.isRunning() && game.players.length > 1) {
                runGame(game)
            }
        })

        socket.on('move-place', (index) => {
            if (game.isRunning() && socket.id === game.getCurrentPlayerId()) {
                game.placeCard(index)

                io.emit('new-round', generateGameInfo(game))

                let gameResult = game.isFinished()
                if (gameResult != 0) {
                    io.emit('game-finished', gameResult)
                }
            }
        })

        socket.on('move-discard', (index) => {
            if (game.isRunning() && socket.id === game.getCurrentPlayerId()) {
                game.discardCard(index)
                
                io.emit('new-round', generateGameInfo(game))

                let gameResult = game.isFinished()
                if (gameResult != 0) {
                    io.emit('game-finished', gameResult)
                }
            }
        })

        socket.on('move-hint', () => {
            if (game.isRunning() && socket.id === game.getCurrentPlayerId()) {
                game.useHint()
                io.emit('new-round', generateGameInfo(game))
            }
        })

        socket.on('back-to-lobby', () => {
            if (!game.isRunning()) {
                game.restartGame()
                io.emit('player-joined', game.players)
            }
        })

        socket.on('msg-user', (object) => {
            extraFeatures(object);
        })

        // Manejar eventos 'disconnect'
        socket.on('disconnect', () => {
            const index = game.players.findIndex(player => player.id === socket.id)
            if (index !== -1) {
                console.log(`${game.players[index].name} disconnected`);
                // Implement a mthod to remove players from the game
                io.emit('player-left', game.players)
            }
        });
    });
}


const runGame = (game) => {

    console.log('GAME STARTED!')
    game.initialize()

    io.emit('game-started')
    io.emit('new-round', generateGameInfo(game))
}

lobby()

app.use(express.static(path.join(__dirname, 'public')));
http.listen(PORT, () => console.log(`Hanabi server running on port ${PORT}!`));