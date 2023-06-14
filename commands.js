
const COMMANDS = {
    msg: (args, io, game) => {
        const player = game.players.find(player => player.name === args[1])
        const socketID = player.id
        io.to(socketID).emit('alert', args[2]);
    },
    removeplayer: (args, io, game) => {
        game.removePlayer(args.slice(1).join(' '))
    },
    alert: (args, io, game) => {
        if (args[1] != 'broadcast') {
            const player = game.players.find(player => player.name === args[1])
            if (player) {
                const socketID = player.id
                io.to(socketID).emit('alert', args.slice(2).join(' '));
            } else {
                console.log(`Player ${args[1]} not found`)
            }
        } else if (args[1] == 'broadcast') {
            io.emit('alert', args.slice(2).join(' '));
        }
    },
    listPlayers: (args, io, game) => {
        game.players.forEach((player) => {console.log(` - ${player.name}`)})
    }
}

module.exports = { COMMANDS }