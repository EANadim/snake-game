<script setup lang="ts">
import { ref } from 'vue'
import SnakeGame from './components/SnakeGame.vue'
import MultiplayerView from './components/MultiplayerView.vue'

type View = 'menu' | 'single' | 'multi'
const view = ref<View>('menu')
</script>

<template>
  <main class="app">
    <div v-if="view === 'menu'" class="menu">
      <div class="menu-title">SNAKE</div>
      <p class="menu-sub">Choose a mode</p>
      <button class="menu-btn" @click="view = 'single'">Single Player</button>
      <button class="menu-btn primary" @click="view = 'multi'">Multiplayer</button>
    </div>

    <template v-else-if="view === 'single'">
      <div class="back-bar">
        <button class="back" @click="view = 'menu'">← Menu</button>
      </div>
      <SnakeGame />
    </template>

    <template v-else>
      <div class="back-bar">
        <button class="back" @click="view = 'menu'">← Menu</button>
      </div>
      <MultiplayerView @back="view = 'menu'" />
    </template>
  </main>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #e6e8ee;
}

.menu-title {
  font-weight: 800;
  font-size: 48px;
  letter-spacing: 12px;
  color: #6ee7a0;
}

.menu-sub {
  font-size: 14px;
  color: #8a90a0;
  margin: 0 0 8px;
}

.menu-btn {
  width: 240px;
  padding: 14px 18px;
  border-radius: 11px;
  border: 1px solid #2a2e38;
  background: #15171d;
  color: #f1f2f6;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.menu-btn:hover {
  background: #1b1e25;
}
.menu-btn.primary {
  border-color: #2a8a55;
  background: #1d6a44;
  color: #eaf7ee;
}
.menu-btn.primary:hover {
  background: #248055;
}

.back-bar {
  width: 100%;
  max-width: 720px;
  display: flex;
  justify-content: flex-start;
  padding: 0 16px;
}

.back {
  background: transparent;
  border: 1px solid #2a2e38;
  color: #cfd3dc;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.back:hover {
  background: #1b1e25;
}
</style>
