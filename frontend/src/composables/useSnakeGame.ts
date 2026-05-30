import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import {
  createGame,
  tick,
  setDirection,
  type GameState,
} from '../game/state'
import { createRenderer, type Renderer } from '../game/renderer'
import { TICK_MS } from '../game/constants'

export function useSnakeGame(canvasRef: Ref<HTMLCanvasElement | null>) {
  const score = ref(0)
  const highScore = ref(0)
  const isGameOver = ref(false)
  const isPaused = ref(false)
  const hasStarted = ref(false)

  let state: GameState | null = null
  let renderer: Renderer | null = null
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let resizeObserver: ResizeObserver | null = null

  function resetGame() {
    state = createGame()
    score.value = 0
    isGameOver.value = false
    isPaused.value = false
    hasStarted.value = false
    if (renderer) {
      renderer.syncSnake(state)
      renderer.syncFood(state.food)
    }
  }

  function togglePause() {
    if (isGameOver.value) return
    isPaused.value = !isPaused.value
  }

  function applyDirection(dx: number, dy: number) {
    if (!state || isGameOver.value) return
    setDirection(state, dx, dy)
    if (!hasStarted.value) hasStarted.value = true
  }

  function doTick() {
    if (
      !state ||
      !renderer ||
      !hasStarted.value ||
      isPaused.value ||
      isGameOver.value
    )
      return
    const result = tick(state)
    score.value = state.score
    if (state.score > highScore.value) highScore.value = state.score
    isGameOver.value = state.isGameOver
    renderer.syncSnake(state)
    if (result === 'ate') renderer.syncFood(state.food)
  }

  function onKeyDown(e: KeyboardEvent) {
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
      case ' ':
        if (isGameOver.value) resetGame()
        else togglePause()
        e.preventDefault()
        break
      case 'r':
      case 'R':
        resetGame()
        break
    }
  }

  onMounted(() => {
    if (!canvasRef.value) return
    renderer = createRenderer(canvasRef.value)
    resetGame()
    tickTimer = setInterval(doTick, TICK_MS)
    resizeObserver = new ResizeObserver(() => renderer?.resize())
    resizeObserver.observe(canvasRef.value)
    window.addEventListener('keydown', onKeyDown)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    window.removeEventListener('keydown', onKeyDown)
    if (tickTimer) clearInterval(tickTimer)
    renderer?.dispose()
  })

  return {
    score,
    highScore,
    isGameOver,
    isPaused,
    hasStarted,
    restart: resetGame,
    togglePause,
  }
}
