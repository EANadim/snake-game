<script setup lang="ts">
import SnakeGame from './components/SnakeGame.vue'
</script>

<template>
  <main class="app">
    <SnakeGame />
  </main>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
</style>
