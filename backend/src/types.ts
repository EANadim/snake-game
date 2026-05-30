export interface Cell {
  x: number
  y: number
}

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished'

export type GameResult = 'win' | 'lose' | 'draw'

/** Per-tick snapshot broadcast to every client in a room. */
export interface Snapshot {
  status: RoomStatus
  snakes: Cell[][] // indexed by player index; [] for an empty / dead-cleared slot
  scores: number[]
  alive: boolean[]
  food: Cell | null
  timeLeftMs: number
}

/** Sent once when the match ends. `result` is from the receiving player's POV. */
export interface GameOverPayload {
  result: GameResult
  reason: string
  scores: number[]
}

// ---- Client -> Server events ----
export interface ClientToServerEvents {
  createRoom: () => void
  joinRoom: (payload: { code: string }) => void
  setDirection: (payload: { dx: number; dy: number }) => void
  leaveRoom: () => void
}

// Per-socket data the server attaches (survives until after `disconnect`).
export interface SocketData {
  roomCode?: string
}

// ---- Server -> Client events ----
export interface ServerToClientEvents {
  roomCreated: (payload: { code: string; playerIndex: number }) => void
  joinResult: (payload: {
    ok: boolean
    code?: string
    playerIndex?: number
    error?: string
  }) => void
  opponentJoined: () => void
  countdown: (payload: { secondsLeft: number }) => void
  state: (payload: Snapshot) => void
  gameOver: (payload: GameOverPayload) => void
  opponentLeft: () => void
}
