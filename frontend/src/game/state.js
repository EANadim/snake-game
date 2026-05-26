import { GRID } from './constants.js'

export function createGame() {
  const state = {
    snake: [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ],
    direction: { x: 1, y: 0 },
    queuedDir: { x: 1, y: 0 },
    food: null,
    score: 0,
    isGameOver: false,
  }
  placeFood(state)
  return state
}

export function placeFood(state) {
  const free = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!state.snake.some((s) => s.x === x && s.y === y)) free.push({ x, y })
    }
  }
  state.food = free.length ? free[Math.floor(Math.random() * free.length)] : null
}

export function setDirection(state, dx, dy) {
  if (dx === -state.direction.x && dy === -state.direction.y) return
  state.queuedDir = { x: dx, y: dy }
}

export function tick(state) {
  if (state.isGameOver) return 'dead'
  state.direction = state.queuedDir
  const head = state.snake[0]
  const next = { x: head.x + state.direction.x, y: head.y + state.direction.y }

  if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
    state.isGameOver = true
    return 'dead'
  }
  if (state.snake.some((s) => s.x === next.x && s.y === next.y)) {
    state.isGameOver = true
    return 'dead'
  }

  state.snake.unshift(next)
  if (state.food && next.x === state.food.x && next.y === state.food.y) {
    state.score += 1
    placeFood(state)
    return 'ate'
  }
  state.snake.pop()
  return 'moved'
}
