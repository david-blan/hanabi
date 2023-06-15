const socket = io();

//== Root Component ============================================================
const RootComponent = {
  name: 'RootComponent',
  data: function() {
    return {
      joined: false,
      playing: false,
      id: null,
      gameResult: 0,
    }
  },
  methods: {
  },
  mounted() {
    socket.on('join-success', (id) => {
      this.joined = true
      this.id = id
    })
    socket.on('game-started', () => {
      this.playing = true
      this.gameResult = 0
    })
    socket.on('re-joined', (id) => {
      this.joined = true
      this.id = id
      this.playing = true
    })
    socket.on('game-finished', (gameResult) => {
      this.playing = false
      this.gameResult = gameResult
    })
    socket.on('alert', (msg) => {
      alert(msg)
    })
  },
  template: `
    <LoginComponent v-if="!joined"></LoginComponent>
    <LobbyComponent v-if="joined & !playing & gameResult==0"></LobbyComponent>
    <InGameComponent v-if="playing & gameResult==0" :playerId="id"></InGameComponent>
    <GameResultComponent v-if="gameResult != 0" :gameResult="gameResult" @restartGame="gameResult=0"></GameResultComponent>
  `
}

//== Login Component ============================================================
const LoginComponent = {
  name: 'LoginComponent',
  data: function() {
    return {
      name: ''
    }
  },
  methods: {
    joinGame() {
      socket.emit('join-attempt', this.name)
    }
  },
  mounted() {
    socket.on('name-exists', () => {
      alert('Name already in use.')
    })
  },
  template: `
    <div style="height:700px; text-align:center; display:flex; justify-content:center; align-items:center; flex-direction:column;">
      <form @submit.prevent="joinGame">
        <label>username</label><br>
        <input v-model="name" style="margin-top:5px; margin-bottom:20px"><br>
        <button>JOIN</button>
      </form>
    </div>
  `
}

//== Lobby Component ============================================================
const LobbyComponent = {
  name: 'LobbyComponent',
  emits: ['gameStarted'],
  data: function() {
    return {
      players: [],
      musicVolume: 0.5,
    }
  },
  methods: {
    start() {
      socket.emit('start-request')
    },
  },
  mounted() {
    socket.on('player-joined', players => {
      this.players = players
    }),
    socket.on('player-left', players => {
      this.players = players
    })
  },
  template: `
    <div style="position:absolute; top:20px; right:30px">
      <input type="range" min="0" max="1" step="0.01" v-model="musicVolume">
      <audio ref="audioPlayer" loop autoplay :volume="musicVolume">
        <source src="/media/music/elevator_music.mp3" type="audio/mpeg">
        Tu navegador no admite la reproducción de audio.
      </audio>
    </div>
    <div style="display:flex; justify-content: center; gap: 100px">
      <h3 v-for="player in players">{{player.name}}</h3>
    </div>
    <div style="text-align:center">
      <button @click="start">START GAME!</button>
    </div>
    <div style="text-align: center; margin-top: 100px">
      <p>Esto es una versión beta, es posible que encontréis bugs. Si os pasa me la pela bastante la verdad.</p>
      <p>Si queréis apoyar a este pobre programador, podéis realizar un pequeño donativo pulsando el siguiente botón :)</p>
      <button onclick="location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'">BIZUM / PAYPAL</button>
    </div>
  `
}


//== In-Game Component ============================================================
const InGameComponent = {
  name: 'InGameComponent',
  props: ['playerId'],
  data: function() {
    return {
      otherPlayersInfo: [],
      myInfo: [],
      gameInfo: {}
    }
  },
  methods: {
  
  },
  mounted() {
    socket.on('new-round', (gameInfo) => {
      this.gameInfo = gameInfo

      let index = gameInfo.users.findIndex(player => player.id === this.playerId)
      if (index !== -1) {
        this.otherPlayersInfo = gameInfo.users.toSpliced(index, 1)
      }

      this.myInfo = gameInfo.users.find(player => player.id === this.playerId)
    })
  },
  template: `
    <div style="display:flex; justify-content: space-around">
      <div v-for="user in otherPlayersInfo">
          <h3 class="username" :style="{'color': gameInfo.turn==user.id?'red':'black'}">{{user.name}}</h3>
          <CardsComponent :cardList="user.cards"></CardsComponent>
      </div>
    </div>
    <TableComponent v-if="Object.keys(gameInfo).length > 0" :gameInfo="gameInfo"></TableComponent>
    
    <OwnCardsComponent :cardList="myInfo.cards" :turn="gameInfo.turn==playerId"></OwnCardsComponent>
  `
}


//== Card Component ============================================================
const CardsComponent = {
  name: 'CardsComponent',
  props: ['cardList'],
  data: function() {
    return {
      selected: null,
    }
  },
  methods: {

  },
  template: `
    <div style="display:flex; justify-content:center; gap:7px">
      <div v-for="(card, index) in cardList" style="text-align:center">
        <img :src="'./media/'+card.number+'_'+card.color+'.png'" height="130">
      </div>
    </div>
  `
}


//== Own Cards Component ============================================================
const OwnCardsComponent = {
  name: 'OwnCardsComponent',
  props: ['cardList', 'turn'],
  data: function() {
    return {
      selected: null,
    }
  },
  methods: {
    selectCard(index) {
      this.selected = this.selected === index ? null : index
    },
    placeCard() {
      if (this.selected !== null) {
        socket.emit('move-place', this.selected)
        this.selected = null
      } else {
        alert('Selecciona una carta antes.')
      }
    },
    discardCard() {
      if (this.selected !== null) {
        socket.emit('move-discard', this.selected)
        this.selected = null
      } else {
        alert('Selecciona una carta antes.')
      }
    },
    useHint() {
      socket.emit('move-hint')
      this.selected = null
    }
  },
  template: `
    <div v-if="turn" style="text-align:center">
      <h2>ES TU TURNO!</h2>
    </div>
    <div style="display:flex; justify-content:center; margin-top:15px; gap:7px; max-height:110px">
      <div class="ownCard" v-for="(card, index) in cardList" @click="selectCard(index)" style="text-align:center">
        <img src="./media/card_reverse.png" :height="index === selected ? 130 : 100" :style="index === selected ? {position:'relative', bottom:'15px', height:125} : {}">
      </div>
    </div>
    <div v-if="turn">
      <div style="display:flex; justify-content:center; margin-top:15px; gap:10px">
        <button @click="placeCard">COLOCAR</button>
        <button @click="discardCard">DESCARTAR</button>
      </div>
      <div style="text-align:center; margin-top:15px">
        <button @click="useHint">USAR PISTA</button>
      </div>
    </div>
  `
}


//== Table Component ============================================================
const TableComponent = {
  name: 'TableComponent',
  props: ['gameInfo'],
  data: function() {
    return {
      glowStyle: {'-webkit-box-shadow': '0px 0px 3px 5px #f2e1f2', '-moz-box-shadow': '0px 0px 3px 5px #f2e1f2', 'box-shadow': '0px 0px 3px 5px #f2e1f2', 'border-radius': '8px'}
    }
  },
  template: `
    <div style="display: flex; gap: 10px; position: absolute; top: 15px; right: 15px">
      <h3 class="tableTitle">MAZO: {{gameInfo.cardsRemaining}}</h3>
      <img src="./media/card_reverse.png" height="50">
    </div>
    <div style="max-height:350px">
      <div style="display:flex; justify-content:center; gap:0 50px; margin-top:15px">
        <div style="display: flex; gap: 10px">
          <h3 class="tableTitle">VIDAS:</h3>
          <div>
            <img src="./media/heart.png" v-for="life in gameInfo.lifes" height="50" style="margin-right: 5px">
            <img src="./media/empty_heart.png" v-for="empty_life in (3-gameInfo.lifes)" height="50" style="margin-right: 5px">
          </div>
        </div>
        <div style="display: flex; gap: 10px">
          <h3 class="tableTitle">PISTAS:</h3>
          <div>
            <img src="./media/hint.png" v-for="life in gameInfo.hints" height="50" style="margin-right: 5px">
            <img src="./media/empty_hint.png" v-for="empty_hint in (8-gameInfo.hints)" height="50" style="margin-right: 5px">
          </div>
        </div>
      </div>

      
      
      <div style="display:flex; justify-content:space-around">
        <div>
          <h3 class="tableTitle">MESA</h3>
          <div style="display:flex; justify-content:center; gap:7px; height: 350px; max-height:350px">
            <div v-for="color in Object.keys(gameInfo.table.placed)">
              <div class="tableCard" v-for="(card, index) in gameInfo.table.placed[color]" :style="{'bottom':index==0 ? '0px' : ((index)*123)+'px'}">
                <img :src="'./media/'+card.number+'_'+card.color+'.png'" height="150" :style="card.id==gameInfo.table.lastMoved ? glowStyle:''">
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="tableTitle">DESCARTES</h3>
          <div style="display:flex; justify-content:center; gap:7px; height: 350px; max-height:350px">
            <div v-for="color in Object.keys(gameInfo.table.discards)">
              <div class="tableCard" v-for="(card, index) in gameInfo.table.discards[color]" :style="{'bottom':index==0 ? '0px' : ((index)*123)+'px'}">
                <img :src="'./media/'+card.number+'_'+card.color+'.png'" height="150" :style="card.id==gameInfo.table.lastMoved ? glowStyle:''">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}


//== Game Result Component ============================================================
const GameResultComponent = {
  name: 'GameResultComponent',
  props: ['gameResult'],
  emits: ['restartGame'],
  data: function() {
    return {
      selected: null,
    }
  },
  methods: {
    backToLobby() {
      this.$emit('restartGame')
      socket.emit('back-to-lobby')
    }
  },
  template: `
    <div style="text-align:center">
    <h1 v-if="gameResult==1" style="font-size:100px">VICTORIA!</h1>
    <h1 v-if="gameResult==-1" style="font-size:100px">DERROTA... :(</h1>
    <button @click="backToLobby">VOLVER AL LOBBY</button>
    </div>
  `
}


const app = Vue.createApp(RootComponent);
app.component('LobbyComponent', LobbyComponent);
app.component('CardsComponent', CardsComponent);
app.component('InGameComponent', InGameComponent);
app.component('LoginComponent', LoginComponent);
app.component('OwnCardsComponent', OwnCardsComponent);
app.component('TableComponent', TableComponent);
app.component('GameResultComponent', GameResultComponent);
const vm = app.mount("#app");
