<template>
  <div class="game-wrap">
    <header class="hud">
      <div class="title">SNAKE</div>
      <div class="stats">
        <div class="stat">
          <span class="label">Score</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="stat">
          <span class="label">Best</span>
          <span class="value">{{ highScore }}</span>
        </div>
      </div>
    </header>

    <div class="canvas-wrap">
      <canvas ref="canvasRef" class="game-canvas" />
      <div v-if="isGameOver" class="overlay">
        <div class="overlay-card">
          <div class="big">Game Over</div>
          <div class="sub">Score: {{ score }}</div>
          <button class="btn" @click="handleRestart">Play again</button>
          <div class="hint">or press Space / R</div>
        </div>
      </div>
      <div v-else-if="isPaused" class="overlay">
        <div class="overlay-card">
          <div class="big">Paused</div>
          <button class="btn" @click="handlePauseToggle">Resume</button>
        </div>
      </div>
      <div v-else-if="!hasStarted" class="overlay">
        <div class="overlay-card">
          <div class="big">Ready</div>
          <div class="sub">Press any direction to start</div>
        </div>
      </div>
    </div>

    <footer class="controls">
      <span><kbd>WASD</kbd> / <kbd>Arrows</kbd> move</span>
      <span><kbd>Space</kbd> pause</span>
      <span><kbd>R</kbd> restart</span>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
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
} from "@babylonjs/core";

const canvasRef = ref(null);
const score = ref(0);
const highScore = ref(0);
const isGameOver = ref(false);
const isPaused = ref(false);
const hasStarted = ref(false);

const GRID = 20;
const TICK_MS = 110;

let engine = null;
let scene = null;
let snakeMat = null;
let headMat = null;
let foodMat = null;

let snake = [];
let direction = { x: 1, y: 0 };
let queuedDir = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let snakeMeshes = [];
let foodMesh = null;
let tickTimer = null;

function makeSegment(x, y, isHead) {
  const box = MeshBuilder.CreateBox(
    "seg",
    { width: 0.9, height: 0.9, depth: 0.2 },
    scene,
  );
  box.position = new Vector3(x + 0.5, y + 0.5, 0);
  box.material = isHead ? headMat : snakeMat;
  return box;
}

function placeFood() {
  const free = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  if (free.length === 0) {
    if (foodMesh) {
      foodMesh.dispose();
      foodMesh = null;
    }
    return;
  }
  food = free[Math.floor(Math.random() * free.length)];
  if (!foodMesh) {
    foodMesh = MeshBuilder.CreateBox(
      "food",
      { width: 0.7, height: 0.7, depth: 0.2 },
      scene,
    );
    foodMesh.material = foodMat;
  }
  foodMesh.position = new Vector3(food.x + 0.5, food.y + 0.5, 0);
}

function syncSnakeMeshes() {
  while (snakeMeshes.length < snake.length) {
    snakeMeshes.push(makeSegment(0, 0, false));
  }
  while (snakeMeshes.length > snake.length) {
    snakeMeshes.pop().dispose();
  }
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const mesh = snakeMeshes[i];
    mesh.position.x = seg.x + 0.5;
    mesh.position.y = seg.y + 0.5;
    mesh.material = i === 0 ? headMat : snakeMat;
  }
}

function resetGame() {
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  queuedDir = { x: 1, y: 0 };
  score.value = 0;
  isGameOver.value = false;
  isPaused.value = false;
  hasStarted.value = false;
  placeFood();
  syncSnakeMeshes();
}

function tick() {
  if (!hasStarted.value || isPaused.value || isGameOver.value) return;
  direction = queuedDir;
  const head = snake[0];
  const next = { x: head.x + direction.x, y: head.y + direction.y };

  if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
    endGame();
    return;
  }
  if (snake.some((s) => s.x === next.x && s.y === next.y)) {
    endGame();
    return;
  }

  snake.unshift(next);
  if (next.x === food.x && next.y === food.y) {
    score.value += 1;
    if (score.value > highScore.value) highScore.value = score.value;
    placeFood();
  } else {
    snake.pop();
  }
  syncSnakeMeshes();
}

function endGame() {
  isGameOver.value = true;
}

function setDirection(dx, dy) {
  if (dx === -direction.x && dy === -direction.y) return;
  queuedDir = { x: dx, y: dy };
  if (!hasStarted.value && !isGameOver.value) hasStarted.value = true;
}

function onKeyDown(e) {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      setDirection(0, 1);
      e.preventDefault();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      setDirection(0, -1);
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      setDirection(-1, 0);
      e.preventDefault();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      setDirection(1, 0);
      e.preventDefault();
      break;
    case " ":
      if (isGameOver.value) resetGame();
      else isPaused.value = !isPaused.value;
      e.preventDefault();
      break;
    case "r":
    case "R":
      resetGame();
      break;
  }
}

function buildGrid() {
  for (let i = 0; i <= GRID; i++) {
    const v = LinesBuilder.CreateLines(
      "gridv",
      {
        points: [new Vector3(i, 0, 0.05), new Vector3(i, GRID, 0.05)],
      },
      scene,
    );
    v.color = new Color3(0.16, 0.18, 0.22);
    const h = LinesBuilder.CreateLines(
      "gridh",
      {
        points: [new Vector3(0, i, 0.05), new Vector3(GRID, i, 0.05)],
      },
      scene,
    );
    h.color = new Color3(0.16, 0.18, 0.22);
  }
}

onMounted(() => {
  engine = new Engine(canvasRef.value, true, { stencil: true });
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.07, 0.08, 0.11, 1);

  const camera = new FreeCamera(
    "cam",
    new Vector3(GRID / 2, GRID / 2, -10),
    scene,
  );
  camera.setTarget(new Vector3(GRID / 2, GRID / 2, 0));
  camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

  const resizeOrtho = () => {
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    if (!w || !h) return;
    const aspect = w / h;
    const halfH = GRID / 2;
    const halfW = halfH * aspect;
    camera.orthoLeft = -halfW;
    camera.orthoRight = halfW;
    camera.orthoBottom = -halfH;
    camera.orthoTop = halfH;
  };

  new HemisphericLight("h", new Vector3(0, 0, -1), scene);

  snakeMat = new StandardMaterial("snake", scene);
  snakeMat.diffuseColor = new Color3(0.3, 0.85, 0.45);
  snakeMat.emissiveColor = new Color3(0.12, 0.4, 0.2);
  snakeMat.specularColor = new Color3(0, 0, 0);

  headMat = new StandardMaterial("head", scene);
  headMat.diffuseColor = new Color3(0.55, 1, 0.6);
  headMat.emissiveColor = new Color3(0.25, 0.55, 0.3);
  headMat.specularColor = new Color3(0, 0, 0);

  foodMat = new StandardMaterial("food", scene);
  foodMat.diffuseColor = new Color3(0.95, 0.35, 0.4);
  foodMat.emissiveColor = new Color3(0.5, 0.1, 0.15);
  foodMat.specularColor = new Color3(0, 0, 0);

  buildGrid();
  resetGame();

  engine.runRenderLoop(() => scene.render());
  tickTimer = setInterval(tick, TICK_MS);

  const onResize = () => {
    engine.resize();
    resizeOrtho();
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvasRef.value);
  onResize();
  window.addEventListener("keydown", onKeyDown);

  onBeforeUnmount(() => {
    ro.disconnect();
    window.removeEventListener("keydown", onKeyDown);
    if (tickTimer) clearInterval(tickTimer);
    engine.dispose();
  });
});

function handleRestart() {
  resetGame();
}

function handlePauseToggle() {
  if (isGameOver.value) return;
  isPaused.value = !isPaused.value;
}
</script>

<style scoped>
.game-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
  color: #e6e8ee;
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
}

.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.title {
  font-weight: 800;
  font-size: 28px;
  letter-spacing: 6px;
  color: #6ee7a0;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 14px;
  border-radius: 10px;
  background: #15171d;
  border: 1px solid #23262e;
  min-width: 78px;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #8a90a0;
}

.value {
  font-size: 20px;
  font-weight: 700;
  color: #f1f2f6;
}

.canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #23262e;
  background: #0b0d12;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 10, 14, 0.6);
  backdrop-filter: blur(4px);
}

.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 32px;
  border-radius: 14px;
  background: #15171d;
  border: 1px solid #23262e;
}

.big {
  font-size: 28px;
  font-weight: 800;
  color: #f1f2f6;
}

.sub {
  font-size: 14px;
  color: #8a90a0;
}

.btn {
  margin-top: 6px;
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid #2a8a55;
  background: #1d6a44;
  color: #eaf7ee;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover {
  background: #248055;
}

.hint {
  font-size: 12px;
  color: #6b7080;
}

.controls {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 13px;
  color: #8a90a0;
}

kbd {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 5px;
  background: #15171d;
  border: 1px solid #2a2e38;
  border-bottom-width: 2px;
  color: #cfd3dc;
  font-family: inherit;
  font-size: 12px;
  margin-right: 2px;
}
</style>
