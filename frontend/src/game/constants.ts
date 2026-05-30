export const GRID = 20
export const TICK_MS = 110

export type RGB = readonly [number, number, number]
export type RGBA = readonly [number, number, number, number]

export interface MaterialSpec {
  diffuse: RGB
  emissive: RGB
}

export interface SnakeColors {
  body: MaterialSpec
  head: MaterialSpec
}

export const COLORS: {
  bgClear: RGBA
  gridLine: RGB
  snakeBody: MaterialSpec
  snakeHead: MaterialSpec
  food: MaterialSpec
} = {
  bgClear: [0.07, 0.08, 0.11, 1],
  gridLine: [0.16, 0.18, 0.22],
  snakeBody: { diffuse: [0.3, 0.85, 0.45], emissive: [0.12, 0.4, 0.2] },
  snakeHead: { diffuse: [0.55, 1, 0.6], emissive: [0.25, 0.55, 0.3] },
  food: { diffuse: [0.95, 0.35, 0.4], emissive: [0.5, 0.1, 0.15] },
}

// Self = green (matches single-player), opponent = blue/cyan.
export const SNAKE_COLORS: { self: SnakeColors; opponent: SnakeColors } = {
  self: {
    body: COLORS.snakeBody,
    head: COLORS.snakeHead,
  },
  opponent: {
    body: { diffuse: [0.35, 0.6, 0.95], emissive: [0.12, 0.25, 0.5] },
    head: { diffuse: [0.6, 0.8, 1], emissive: [0.25, 0.4, 0.6] },
  },
}
