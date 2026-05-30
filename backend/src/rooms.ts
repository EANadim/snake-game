import type { Server, Socket } from 'socket.io'
import {
  COUNTDOWN_MS,
  MATCH_MS,
  MAX_PLAYERS,
  TICK_MS,
} from './constants.js'
import {
  createGame,
  createPlayer,
  setDirection,
  tick,
  type PlayerState,
  type RoomGame,
} from './game.js'
import type {
  ClientToServerEvents,
  GameResult,
  RoomStatus,
  ServerToClientEvents,
  SocketData,
} from './types.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type ClientSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no easily-confused chars
const CODE_LEN = 4

export class Room {
  readonly code: string
  status: RoomStatus = 'waiting'
  private game: RoomGame
  private players: PlayerState[] = []
  private socketByIndex = new Map<number, ClientSocket>()
  private endsAt = 0
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private countdownTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private io: IO,
    code: string,
    private onEmpty: (code: string) => void
  ) {
    this.code = code
    this.game = createGame(this.players)
  }

  get playerCount(): number {
    return this.players.length
  }

  get isFull(): boolean {
    return this.players.length >= MAX_PLAYERS
  }

  addPlayer(socket: ClientSocket): number {
    const index = this.players.length
    const player = createPlayer(socket.id, index)
    this.players.push(player)
    this.socketByIndex.set(index, socket)
    socket.join(this.code)
    socket.data.roomCode = this.code
    // Refresh food so it never spawns under a freshly-placed snake.
    this.game = createGame(this.players)
    return index
  }

  /** Begin the countdown once both players are present. */
  begin(): void {
    if (this.status !== 'waiting' || this.players.length < MAX_PLAYERS) return
    this.status = 'countdown'
    let secondsLeft = Math.ceil(COUNTDOWN_MS / 1000)
    this.io.to(this.code).emit('countdown', { secondsLeft })
    this.broadcastState()
    this.countdownTimer = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft > 0) {
        this.io.to(this.code).emit('countdown', { secondsLeft })
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer)
        this.countdownTimer = null
        this.startPlaying()
      }
    }, 1000)
  }

  private startPlaying(): void {
    this.status = 'playing'
    this.endsAt = Date.now() + MATCH_MS
    this.broadcastState()
    this.tickTimer = setInterval(() => this.step(), TICK_MS)
  }

  private step(): void {
    tick(this.game)
    this.broadcastState()

    const dead = this.players.filter((p) => !p.alive)
    const timeUp = Date.now() >= this.endsAt

    if (dead.length > 0) {
      this.finish('elimination')
    } else if (timeUp) {
      this.finish('time')
    }
  }

  setDirection(socketId: string, dx: number, dy: number): void {
    if (this.status !== 'playing') return
    const player = this.players.find((p) => p.id === socketId)
    if (player && player.alive) setDirection(player, dx, dy)
  }

  private timeLeftMs(): number {
    if (this.status !== 'playing') return MATCH_MS
    return Math.max(0, this.endsAt - Date.now())
  }

  private broadcastState(): void {
    this.io.to(this.code).emit('state', {
      status: this.status,
      snakes: this.players.map((p) => p.snake),
      scores: this.players.map((p) => p.score),
      alive: this.players.map((p) => p.alive),
      food: this.game.food,
      timeLeftMs: this.timeLeftMs(),
    })
  }

  private finish(cause: 'elimination' | 'time'): void {
    if (this.status === 'finished') return
    this.status = 'finished'
    this.stopTimers()

    const scores = this.players.map((p) => p.score)

    // Determine the winning player index (or null for a draw).
    let winnerIndex: number | null
    if (cause === 'elimination') {
      const alive = this.players.filter((p) => p.alive)
      winnerIndex = alive.length === 1 ? alive[0].index : null // both dead -> draw
    } else {
      if (scores[0] > scores[1]) winnerIndex = 0
      else if (scores[1] > scores[0]) winnerIndex = 1
      else winnerIndex = null
    }

    for (const player of this.players) {
      const socket = this.socketByIndex.get(player.index)
      if (!socket) continue
      let result: GameResult
      if (winnerIndex === null) result = 'draw'
      else result = winnerIndex === player.index ? 'win' : 'lose'
      socket.emit('gameOver', {
        result,
        reason: this.reasonFor(cause, player.index, winnerIndex),
        scores,
      })
    }

    // Tear the room down shortly after so codes free up.
    setTimeout(() => this.destroy(), 1000)
  }

  private reasonFor(
    cause: 'elimination' | 'time',
    playerIndex: number,
    winnerIndex: number | null
  ): string {
    if (cause === 'time') {
      if (winnerIndex === null) return "Time's up — it's a draw!"
      return "Time's up!"
    }
    if (winnerIndex === null) return 'Both snakes crashed!'
    return winnerIndex === playerIndex
      ? 'Your opponent crashed!'
      : 'You crashed!'
  }

  /** A player disconnected or left. Surviving player wins by forfeit. */
  removePlayer(socketId: string): void {
    const leaving = this.players.find((p) => p.id === socketId)
    if (!leaving) return

    if (this.status === 'playing' || this.status === 'countdown') {
      this.stopTimers()
      this.status = 'finished'
      for (const player of this.players) {
        if (player.id === socketId) continue
        const socket = this.socketByIndex.get(player.index)
        socket?.emit('opponentLeft')
        socket?.emit('gameOver', {
          result: 'win',
          reason: 'Opponent left the game.',
          scores: this.players.map((p) => p.score),
        })
      }
      setTimeout(() => this.destroy(), 1000)
      return
    }

    // Waiting room: just drop the player.
    this.socketByIndex.forEach((s, idx) => {
      if (s.id === socketId) this.socketByIndex.delete(idx)
    })
    this.players = this.players.filter((p) => p.id !== socketId)
    if (this.players.length === 0) this.destroy()
  }

  private stopTimers(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.countdownTimer) clearInterval(this.countdownTimer)
    this.tickTimer = null
    this.countdownTimer = null
  }

  destroy(): void {
    this.stopTimers()
    this.onEmpty(this.code)
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>()

  constructor(private io: IO) {}

  private generateCode(): string {
    let code = ''
    do {
      code = ''
      for (let i = 0; i < CODE_LEN; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      }
    } while (this.rooms.has(code))
    return code
  }

  create(socket: ClientSocket): { code: string; playerIndex: number } {
    const code = this.generateCode()
    const room = new Room(this.io, code, (c) => this.rooms.delete(c))
    const playerIndex = room.addPlayer(socket)
    this.rooms.set(code, room)
    return { code, playerIndex }
  }

  join(
    socket: ClientSocket,
    code: string
  ): { ok: true; code: string; playerIndex: number } | { ok: false; error: string } {
    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: 'Room not found.' }
    if (room.isFull) return { ok: false, error: 'Room is full.' }
    if (room.status !== 'waiting')
      return { ok: false, error: 'Game already started.' }
    const playerIndex = room.addPlayer(socket)
    return { ok: true, code, playerIndex }
  }

  roomOf(socket: ClientSocket): Room | undefined {
    // Use socket.data (not socket.rooms): on `disconnect` the socket has
    // already left all rooms, but socket.data still holds the room code.
    const code = socket.data.roomCode
    return code ? this.rooms.get(code) : undefined
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code)
  }
}
