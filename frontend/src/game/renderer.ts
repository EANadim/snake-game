import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  HemisphericLight,
  LinesBuilder,
  type Mesh,
} from '@babylonjs/core'
import { GRID, COLORS, SNAKE_COLORS, type MaterialSpec, type SnakeColors } from './constants'
import type { Cell, GameState } from './state'

/** A snake to draw: a stable id, its cells (head first), and its color set. */
export interface SnakeView {
  id: string
  cells: Cell[]
  colors: SnakeColors
}

export interface Renderer {
  /** Draw an arbitrary set of snakes (multiplayer). */
  syncSnakes(snakes: SnakeView[]): void
  /** Single-snake convenience wrapper (single-player). */
  syncSnake(state: GameState): void
  syncFood(food: Cell | null): void
  resize(): void
  dispose(): void
}

interface SnakePool {
  meshes: Mesh[]
  bodyMat: StandardMaterial
  headMat: StandardMaterial
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const engine = new Engine(canvas, true, { stencil: true })
  const scene = new Scene(engine)
  scene.clearColor = new Color4(...COLORS.bgClear)

  const camera = new FreeCamera('cam', new Vector3(GRID / 2, GRID / 2, -10), scene)
  camera.setTarget(new Vector3(GRID / 2, GRID / 2, 0))
  camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA

  new HemisphericLight('h', new Vector3(0, 0, -1), scene)

  const foodMat = makeMat('food', COLORS.food, scene)
  buildGrid(scene)

  const pools = new Map<string, SnakePool>()
  let foodMesh: Mesh | null = null

  function getPool(id: string, colors: SnakeColors): SnakePool {
    let pool = pools.get(id)
    if (!pool) {
      pool = {
        meshes: [],
        bodyMat: makeMat(`body-${id}`, colors.body, scene),
        headMat: makeMat(`head-${id}`, colors.head, scene),
      }
      pools.set(id, pool)
    }
    return pool
  }

  function syncSnakes(snakes: SnakeView[]) {
    const seen = new Set<string>()
    for (const view of snakes) {
      seen.add(view.id)
      const pool = getPool(view.id, view.colors)
      while (pool.meshes.length < view.cells.length) {
        pool.meshes.push(
          MeshBuilder.CreateBox('seg', { width: 0.9, height: 0.9, depth: 0.2 }, scene)
        )
      }
      while (pool.meshes.length > view.cells.length) {
        pool.meshes.pop()!.dispose()
      }
      for (let i = 0; i < view.cells.length; i++) {
        const seg = view.cells[i]
        const mesh = pool.meshes[i]
        mesh.position.x = seg.x + 0.5
        mesh.position.y = seg.y + 0.5
        mesh.material = i === 0 ? pool.headMat : pool.bodyMat
      }
    }
    // Drop any snakes no longer present.
    for (const [id, pool] of pools) {
      if (seen.has(id)) continue
      pool.meshes.forEach((m) => m.dispose())
      pool.bodyMat.dispose()
      pool.headMat.dispose()
      pools.delete(id)
    }
  }

  function syncSnake(state: GameState) {
    syncSnakes([{ id: 'self', cells: state.snake, colors: SNAKE_COLORS.self }])
  }

  function syncFood(food: Cell | null) {
    if (!food) {
      if (foodMesh) {
        foodMesh.dispose()
        foodMesh = null
      }
      return
    }
    if (!foodMesh) {
      foodMesh = MeshBuilder.CreateBox('food', { width: 0.7, height: 0.7, depth: 0.2 }, scene)
      foodMesh.material = foodMat
    }
    foodMesh.position.x = food.x + 0.5
    foodMesh.position.y = food.y + 0.5
  }

  function resize() {
    engine.resize()
    const w = engine.getRenderWidth()
    const h = engine.getRenderHeight()
    if (!w || !h) return
    const aspect = w / h
    const halfH = GRID / 2
    const halfW = halfH * aspect
    camera.orthoLeft = -halfW
    camera.orthoRight = halfW
    camera.orthoBottom = -halfH
    camera.orthoTop = halfH
  }

  engine.runRenderLoop(() => scene.render())
  resize()

  return {
    syncSnakes,
    syncSnake,
    syncFood,
    resize,
    dispose() {
      engine.dispose()
    },
  }
}

function makeMat(name: string, spec: MaterialSpec, scene: Scene) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = new Color3(...spec.diffuse)
  m.emissiveColor = new Color3(...spec.emissive)
  m.specularColor = new Color3(0, 0, 0)
  return m
}

function buildGrid(scene: Scene) {
  const color = new Color3(...COLORS.gridLine)
  for (let i = 0; i <= GRID; i++) {
    const v = LinesBuilder.CreateLines(
      'gridv',
      { points: [new Vector3(i, 0, 0.05), new Vector3(i, GRID, 0.05)] },
      scene
    )
    v.color = color
    const h = LinesBuilder.CreateLines(
      'gridh',
      { points: [new Vector3(0, i, 0.05), new Vector3(GRID, i, 0.05)] },
      scene
    )
    h.color = color
  }
}
