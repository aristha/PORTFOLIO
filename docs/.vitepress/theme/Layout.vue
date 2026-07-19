<script setup>
import { ref, computed } from 'vue'
import { Content } from 'vitepress'
import TerminalHeader from './components/TerminalHeader.vue'
</script>

<template>
  <div class="ide-root">
    <TerminalHeader />
    <main class="ide-main">
      <div class="ide-page">
        <Content />
      </div>
    </main>
  </div>
</template>
