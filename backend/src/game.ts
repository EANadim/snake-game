import { GRID } from './constants.js'
import type { Cell } from './types.js'

export interface PlayerState {
  id: string
  index: number
  snake: Cell[]
  direction: Cell
  queuedDir: Cell
  score: number
  alive: boolean
}

export interface RoomGame {
  players: PlayerState[]
  food: Cell | null
}

/** Mirrored spawns so the two snakes never overlap at the start. */
function spawnSnake(index: number): Pick<PlayerState, 'snake' | 'direction' | 'queuedDir'> {
  if (index === 0) {
    return {
      snake: [
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 },
      ],
      direction: { x: 1, y: 0 },
      queuedDir: { x: 1, y: 0 },
    }
  }
  return {
    snake: [
      { x: GRID - 7, y: 9 },
      { x: GRID - 6, y: 9 },
      { x: GRID - 5, y: 9 },
    ],
    direction: { x: -1, y: 0 },
    queuedDir: { x: -1, y: 0 },
  }
}

export function createPlayer(id: string, index: number): PlayerState {
  const spawn = spawnSnake(index)
  return {
    id,
    index,
    score: 0,
    alive: true,
    ...spawn,
  }
}

export function createGame(players: PlayerState[]): RoomGame {
  const game: RoomGame = { players, food: null }
  placeFood(game)
  return game
}

/** Place food on a free cell, avoiding every snake's body. */
export function placeFood(game: RoomGame): void {
  const occupied = new Set<string>()
  for (const p of game.players) {
    for (const s of p.snake) occupied.add(`${s.x},${s.y}`)
  }
  const free: Cell[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  game.food = free.length ? free[Math.floor(Math.random() * free.length)] : null
}

/** Queue a direction, rejecting 180° reversals (same guard as single-player). */
export function setDirection(player: PlayerState, dx: number, dy: number): void {
  if (dx === -player.direction.x && dy === -player.direction.y) return
  if (dx === 0 && dy === 0) return
  player.queuedDir = { x: dx, y: dy }
}

/**
 * Advance the whole board by one step. Both snakes move simultaneously:
 * deaths are computed against the pre-move board so neither player has an
 * unfair ordering advantage. Mutates `game` in place.
 */
export function tick(game: RoomGame): void {
  const alivePlayers = game.players.filter((p) => p.alive)

  // 1. Resolve intended direction + next head for each alive player.
  const moves = alivePlayers.map((p) => {
    p.direction = p.queuedDir
    const head = p.snake[0]
    return {
      player: p,
      next: { x: head.x + p.direction.x, y: head.y + p.direction.y } as Cell,
    }
  })

  // 2. Decide who dies, all judged against the pre-move board.
  const dying = new Set<PlayerState>()
  for (const { player, next } of moves) {
    // wall
    if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
      dying.add(player)
      continue
    }
    // collision with any current snake body (self or opponent)
    const hitsBody = game.players.some((other) =>
      other.snake.some((s) => s.x === next.x && s.y === next.y)
    )
    if (hitsBody) dying.add(player)
  }
  // head-to-head: two snakes targeting the same cell both die
  for (let i = 0; i < moves.length; i++) {
    for (let j = i + 1; j < moves.length; j++) {
      if (moves[i].next.x === moves[j].next.x && moves[i].next.y === moves[j].next.y) {
        dying.add(moves[i].player)
        dying.add(moves[j].player)
      }
    }
  }

  for (const p of dying) p.alive = false

  // 3. Apply moves for survivors; lower index resolves food first if tied.
  const survivors = moves
    .filter((m) => m.player.alive)
    .sort((a, b) => a.player.index - b.player.index)

  let foodEaten = false
  for (const { player, next } of survivors) {
    player.snake.unshift(next)
    if (game.food && !foodEaten && next.x === game.food.x && next.y === game.food.y) {
      player.score += 1
      foodEaten = true
      // grow: keep the tail (skip pop)
    } else {
      player.snake.pop()
    }
  }
  if (foodEaten) placeFood(game)
}
