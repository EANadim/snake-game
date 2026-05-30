import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { createRenderer, type Renderer, type SnakeView } from '../game/renderer'
import { SNAKE_COLORS } from '../game/constants'

// ---- Wire types (must match backend/src/types.ts) ----
interface Cell {
  x: number
  y: number
}
type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished'
type GameResult = 'win' | 'lose' | 'draw'
interface Snapshot {
  status: RoomStatus
  snakes: Cell[][]
  scores: number[]
  alive: boolean[]
  food: Cell | null
  timeLeftMs: number
}
interface GameOverPayload {
  result: GameResult
  reason: string
  scores: number[]
}

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001'

/** UI phase, broader than the server's room status. */
export type Phase = 'menu' | 'creating' | 'waiting' | 'countdown' | 'playing' | 'over'

export function useMultiplayerGame(canvasRef: Ref<HTMLCanvasElement | null>) {
  const phase = ref<Phase>('menu')
  const roomCode = ref('')
  const playerIndex = ref(0)
  const myScore = ref(0)
  const opponentScore = ref(0)
  const opponentPresent = ref(false)
  const timeLeftMs = ref(5 * 60 * 1000)
  const countdownSeconds = ref(0)
  const result = ref<GameResult | null>(null)
  const gameOverReason = ref('')
  const errorMsg = ref('')

  let socket: Socket | null = null
  let renderer: Renderer | null = null
  let resizeObserver: ResizeObserver | null = null

  function ensureRenderer() {
    if (!renderer && canvasRef.value) {
      renderer = createRenderer(canvasRef.value)
      resizeObserver = new ResizeObserver(() => renderer?.resize())
      resizeObserver.observe(canvasRef.value)
    }
  }

  function renderSnapshot(snap: Snapshot) {
    ensureRenderer()
    if (!renderer) return
    const views: SnakeView[] = []
    snap.snakes.forEach((cells, idx) => {
      if (!cells.length) return
      const isSelf = idx === playerIndex.value
      views.push({
        id: isSelf ? 'self' : `opp-${idx}`,
        cells,
        colors: isSelf ? SNAKE_COLORS.self : SNAKE_COLORS.opponent,
      })
    })
    renderer.syncSnakes(views)
    renderer.syncFood(snap.food)
  }

  function connect() {
    if (socket) return
    socket = io(SERVER_URL, { transports: ['websocket'] })

    socket.on('roomCreated', ({ code, playerIndex: idx }) => {
      roomCode.value = code
      playerIndex.value = idx
      phase.value = 'waiting'
    })

    socket.on('joinResult', (payload) => {
      if (!payload.ok) {
        errorMsg.value = payload.error ?? 'Could not join room.'
        phase.value = 'menu'
        return
      }
      roomCode.value = payload.code ?? ''
      playerIndex.value = payload.playerIndex ?? 1
      opponentPresent.value = true
      errorMsg.value = ''
      phase.value = 'waiting'
    })

    socket.on('opponentJoined', () => {
      opponentPresent.value = true
    })

    socket.on('countdown', ({ secondsLeft }) => {
      phase.value = 'countdown'
      countdownSeconds.value = secondsLeft
    })

    socket.on('state', (snap: Snapshot) => {
      if (snap.status === 'playing') phase.value = 'playing'
      myScore.value = snap.scores[playerIndex.value] ?? 0
      opponentScore.value =
        snap.scores[playerIndex.value === 0 ? 1 : 0] ?? 0
      timeLeftMs.value = snap.timeLeftMs
      renderSnapshot(snap)
    })

    socket.on('gameOver', (payload: GameOverPayload) => {
      result.value = payload.result
      gameOverReason.value = payload.reason
      myScore.value = payload.scores[playerIndex.value] ?? myScore.value
      opponentScore.value =
        payload.scores[playerIndex.value === 0 ? 1 : 0] ?? opponentScore.value
      phase.value = 'over'
    })

    socket.on('opponentLeft', () => {
      opponentPresent.value = false
    })

    socket.on('disconnect', () => {
      if (phase.value === 'playing' || phase.value === 'countdown') {
        errorMsg.value = 'Lost connection to server.'
      }
    })
  }

  function createRoom() {
    errorMsg.value = ''
    phase.value = 'creating'
    connect()
    socket!.emit('createRoom')
  }

  function joinRoom(code: string) {
    errorMsg.value = ''
    connect()
    socket!.emit('joinRoom', { code: code.trim().toUpperCase() })
  }

  function applyDirection(dx: number, dy: number) {
    socket?.emit('setDirection', { dx, dy })
  }

  function leave() {
    socket?.emit('leaveRoom')
    resetLocal()
  }

  function resetLocal() {
    phase.value = 'menu'
    roomCode.value = ''
    myScore.value = 0
    opponentScore.value = 0
    opponentPresent.value = false
    result.value = null
    gameOverReason.value = ''
    countdownSeconds.value = 0
    timeLeftMs.value = 5 * 60 * 1000
  }

  function onKeyDown(e: KeyboardEvent) {
    // Only steer during active play — otherwise let keystrokes (e.g. typing a
    // room code into the input) pass through untouched.
    if (phase.value !== 'playing') return
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        applyDirection(0, 1)
        e.preventDefault()
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        applyDirection(0, -1)
        e.preventDefault()
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        applyDirection(-1, 0)
        e.preventDefault()
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        applyDirection(1, 0)
        e.preventDefault()
        break
    }
  }

  // Build the renderer as soon as the canvas is mounted.
  watch(canvasRef, () => ensureRenderer())

  onMounted(() => {
    ensureRenderer()
    window.addEventListener('keydown', onKeyDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    resizeObserver?.disconnect()
    renderer?.dispose()
    socket?.disconnect()
    socket = null
  })

  return {
    phase,
    roomCode,
    playerIndex,
    myScore,
    opponentScore,
    opponentPresent,
    timeLeftMs,
    countdownSeconds,
    result,
    gameOverReason,
    errorMsg,
    createRoom,
    joinRoom,
    leave,
  }
}
