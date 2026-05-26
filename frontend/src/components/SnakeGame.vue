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
          <button class="btn" @click="restart">Play again</button>
          <div class="hint">or press Space / R</div>
        </div>
      </div>
      <div v-else-if="isPaused" class="overlay">
        <div class="overlay-card">
          <div class="big">Paused</div>
          <button class="btn" @click="togglePause">Resume</button>
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

<script setup lang="ts">
import { ref } from "vue";
import { useSnakeGame } from "../composables/useSnakeGame";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {
  score,
  highScore,
  isGameOver,
  isPaused,
  hasStarted,
  restart,
  togglePause,
} = useSnakeGame(canvasRef);
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
