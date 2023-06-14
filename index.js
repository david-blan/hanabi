const express = require('express');
const path = require('path');
const { Game, NUMBERS } = require('./utils.js');
const cors = require('cors');
const readline = require('readline');
const { COMMANDS } = require('./commands.js')

const app = express();
app.use(cors())
const http = require('http').createServer(app)
const io = require('socket.io')(http)


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
    }

    return {
        users: userList,
        table: tableObj,
        hints: game.hints,
        lifes: game.lifes,
        turn: (game.isRunning() ? game.getCurrentPlayerId() : -1)
    }
}


const lobby = () => {
    
    let game = new Game()

    // Escuchar conexiones de Socket.IO
    io.on('connection', function(socket) {
        socket.on('join-attempt', (name) => {
            const existing = game.players.find(player => player.name === name)
            if (existing) {
                if (existing.disconnected) { // Player reconnects
                    existing.id = socket.id
                    socket.emit('re-joined', socket.id)
                    socket.emit('new-round', generateGameInfo(game))
                } else {
                    socket.emit('name-exists')
                }
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

        // Manejar eventos 'disconnect'
        socket.on('disconnect', () => {
            const index = game.players.findIndex(player => player.id === socket.id)
            if (index !== -1) {
                game.players[index].disconnected = true
                console.log(`${game.players[index].name} left`);
                if (!game.isRunning()) {
                    game.removePlayer(game.players[index].name)
                    io.emit('player-left', game.players)
                }
            }
        });
    });

    // Crear una interfaz para leer comandos desde la línea de comandos
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.prompt()

    // Leer comandos desde la línea de comandos
    rl.on('line', (input) => {
        const args = input.trim().split(' ');
        (COMMANDS[args[0]])(args, io, game)
        rl.prompt()
    });
}


const runGame = (game) => {

    console.log('GAME STARTED!')
    game.initialize()

    io.emit('game-started')
    io.emit('new-round', generateGameInfo(game))
}

lobby()



// ======================== SERVER ========================

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
http.listen(PORT, () => console.log(`Hanabi server running on port ${PORT}!`));





// app.use(cookieParser('1234567890GFG'));
// function auth(req, res, next) {
 
//     console.log(req.signedCookies.user)
//     // Checking request containing signed
//     // cookies or not
//     if (!req.signedCookies.user) {
 
//         // Asking for authorization
//         let authHeader = req.headers.authorization;
//         if (!authHeader) {
//             var err = new Error('You are not authenticated!');
//             res.setHeader('WWW-Authenticate', 'Basic');
//             err.status = 401;
//             return next(err)
//         }
 
//         // Checking the credintials
//         let auth = new Buffer.from(authHeader.split(' ')[1],
//             'base64').toString().split(':');
 
//         // Username and Password
//         let user = auth[0];
//         let pass = auth[1];
 
//         if (user == 'admin' && pass == 'password') {
 
//             // Sending the set-cookie header to the client side
//             res.cookie("user", "admin", { signed: true })
 
//             // Authorized
//             next();
//         } else {
 
//             // Reject the authorization
//             let err = new Error('You are not authenticated!');
//             res.setHeader('WWW-Authenticate', 'Basic');
//             err.status = 401;
//             return next(err);
//         }
//     }
//     else {
 
//         // Checking whether the signed cookie exist or not
//         if (req.signedCookies.user === "admin") {
//             // Allowing for handling incoming request
//             next()
//         }
//         // Rejects all the incoming requests.
//         else {
//             let err = new Error('You are not authenticated!');
//             err.status = 401;
//             return next(err);
//         }
//     }
// }
 
// // Handling authorization
// app.use(auth);
// app.use(express.static(path.join(__dirname, 'public')));