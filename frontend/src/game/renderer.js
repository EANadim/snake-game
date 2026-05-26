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
} from '@babylonjs/core'
import { GRID, COLORS } from './constants.js'

export function createRenderer(canvas) {
  const engine = new Engine(canvas, true, { stencil: true })
  const scene = new Scene(engine)
  scene.clearColor = new Color4(...COLORS.bgClear)

  const camera = new FreeCamera(
    'cam',
    new Vector3(GRID / 2, GRID / 2, -10),
    scene
  )
  camera.setTarget(new Vector3(GRID / 2, GRID / 2, 0))
  camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA

  new HemisphericLight('h', new Vector3(0, 0, -1), scene)

  const snakeMat = makeMat('snake', COLORS.snakeBody, scene)
  const headMat = makeMat('head', COLORS.snakeHead, scene)
  const foodMat = makeMat('food', COLORS.food, scene)

  buildGrid(scene)

  const snakeMeshes = []
  let foodMesh = null

  function syncSnake(state) {
    while (snakeMeshes.length < state.snake.length) {
      snakeMeshes.push(
        MeshBuilder.CreateBox(
          'seg',
          { width: 0.9, height: 0.9, depth: 0.2 },
          scene
        )
      )
    }
    while (snakeMeshes.length > state.snake.length) {
      snakeMeshes.pop().dispose()
    }
    for (let i = 0; i < state.snake.length; i++) {
      const seg = state.snake[i]
      const mesh = snakeMeshes[i]
      mesh.position.x = seg.x + 0.5
      mesh.position.y = seg.y + 0.5
      mesh.material = i === 0 ? headMat : snakeMat
    }
  }

  function syncFood(state) {
    if (!state.food) {
      if (foodMesh) {
        foodMesh.dispose()
        foodMesh = null
      }
      return
    }
    if (!foodMesh) {
      foodMesh = MeshBuilder.CreateBox(
        'food',
        { width: 0.7, height: 0.7, depth: 0.2 },
        scene
      )
      foodMesh.material = foodMat
    }
    foodMesh.position.x = state.food.x + 0.5
    foodMesh.position.y = state.food.y + 0.5
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
    syncSnake,
    syncFood,
    resize,
    dispose() {
      engine.dispose()
    },
  }
}

function makeMat(name, spec, scene) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = new Color3(...spec.diffuse)
  m.emissiveColor = new Color3(...spec.emissive)
  m.specularColor = new Color3(0, 0, 0)
  return m
}

function buildGrid(scene) {
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
