<template>
  <div class="game-wrap">
    <header class="hud">
      <div class="title">SNAKE · VS</div>
      <div class="stats">
        <div class="stat you">
          <span class="label">You</span>
          <span class="value">{{ myScore }}</span>
        </div>
        <div class="stat timer">
          <span class="label">Time</span>
          <span class="value">{{ clock }}</span>
        </div>
        <div class="stat opp">
          <span class="label">Rival</span>
          <span class="value">{{ opponentScore }}</span>
        </div>
      </div>
    </header>

    <div class="canvas-wrap">
      <canvas ref="canvasRef" class="game-canvas" />

      <!-- Menu: create / join -->
      <div v-if="phase === 'menu'" class="overlay">
        <div class="overlay-card">
          <div class="big">Multiplayer</div>
          <button class="btn" @click="createRoom">Create room</button>
          <div class="divider">or join with a code</div>
          <div class="join-row">
            <input
              v-model="joinCode"
              class="code-input"
              maxlength="5"
              placeholder="CODE"
              @keyup.enter="joinRoom(joinCode)"
            />
            <button class="btn" :disabled="!joinCode.trim()" @click="joinRoom(joinCode)">
              Join
            </button>
          </div>
          <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
          <button class="btn ghost" @click="$emit('back')">← Back to menu</button>
        </div>
      </div>

      <div v-else-if="phase === 'creating'" class="overlay">
        <div class="overlay-card"><div class="big">Creating room…</div></div>
      </div>

      <!-- Waiting for opponent -->
      <div v-else-if="phase === 'waiting'" class="overlay">
        <div class="overlay-card">
          <div class="big">Room code</div>
          <div class="room-code">{{ roomCode }}</div>
          <div class="sub">Share this code with a friend to start.</div>
          <div class="hint">{{ opponentPresent ? 'Opponent joined!' : 'Waiting for opponent…' }}</div>
          <button class="btn ghost" @click="leaveAndBack">Cancel</button>
        </div>
      </div>

      <!-- Countdown -->
      <div v-else-if="phase === 'countdown'" class="overlay">
        <div class="overlay-card">
          <div class="big">Get ready…</div>
          <div class="countdown">{{ countdownSeconds }}</div>
        </div>
      </div>

      <!-- Game over -->
      <div v-else-if="phase === 'over'" class="overlay">
        <div class="overlay-card">
          <div class="big" :class="resultClass">{{ resultTitle }}</div>
          <div class="sub">{{ gameOverReason }}</div>
          <div class="sub">You {{ myScore }} · Rival {{ opponentScore }}</div>
          <button class="btn" @click="leaveAndBack">Back to lobby</button>
        </div>
      </div>
    </div>

    <footer class="controls">
      <span><kbd>WASD</kbd> / <kbd>Arrows</kbd> move</span>
      <span>First to crash loses · most food in 5:00 wins</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMultiplayerGame } from '../composables/useMultiplayerGame'

defineEmits<{ back: [] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const joinCode = ref('')

const {
  phase,
  roomCode,
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
} = useMultiplayerGame(canvasRef)

const clock = computed(() => {
  const total = Math.ceil(timeLeftMs.value / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const resultTitle = computed(() =>
  result.value === 'win' ? 'You Win!' : result.value === 'lose' ? 'You Lose' : 'Draw'
)
const resultClass = computed(() => result.value ?? '')

function leaveAndBack() {
  leave()
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
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.title {
  font-weight: 800;
  font-size: 26px;
  letter-spacing: 5px;
  color: #6ee7a0;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  border-radius: 10px;
  background: #15171d;
  border: 1px solid #23262e;
  min-width: 70px;
}

.stat.you {
  border-color: #2a8a55;
}
.stat.opp {
  border-color: #3a5fb0;
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
  background: rgba(8, 10, 14, 0.65);
  backdrop-filter: blur(4px);
}

.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 36px;
  border-radius: 14px;
  background: #15171d;
  border: 1px solid #23262e;
  min-width: 260px;
}

.big {
  font-size: 28px;
  font-weight: 800;
  color: #f1f2f6;
}
.big.win {
  color: #6ee7a0;
}
.big.lose {
  color: #f08a8a;
}
.big.draw {
  color: #e2c96e;
}

.sub {
  font-size: 14px;
  color: #8a90a0;
}

.room-code {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 8px;
  color: #6ee7a0;
}

.countdown {
  font-size: 64px;
  font-weight: 800;
  color: #6ee7a0;
}

.divider {
  font-size: 12px;
  color: #6b7080;
}

.join-row {
  display: flex;
  gap: 8px;
}

.code-input {
  width: 110px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid #2a2e38;
  background: #0b0d12;
  color: #f1f2f6;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  text-align: center;
}

.btn {
  margin-top: 2px;
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid #2a8a55;
  background: #1d6a44;
  color: #eaf7ee;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn:hover:not(:disabled) {
  background: #248055;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.ghost {
  background: transparent;
  border-color: #2a2e38;
  color: #cfd3dc;
}
.btn.ghost:hover {
  background: #1b1e25;
}

.error {
  font-size: 13px;
  color: #f08a8a;
}

.hint {
  font-size: 13px;
  color: #6ee7a0;
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
  font-size: 12px;
  margin-right: 2px;
}
</style>
