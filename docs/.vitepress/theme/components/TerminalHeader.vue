<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const mobileOpen = ref(false)

const nav = [
  { cmd: 'home',         link: '/' },
  { cmd: 'case-studies', link: '/case-studies' },
  { cmd: 'philosophy',   link: '/philosophy' },
  { cmd: 'about',        link: '/about' },
  { cmd: 'cv',           link: '/cv' },
]

const isActive = (link) =>
  link === '/' ? route.path === '/' : route.path.startsWith(link)

const filePath = computed(() => {
  const p = route.path.replace(/^\/|\/$/g, '')
  if (!p) return '~/portfolio/home.md'
  const segments = p.split('/')
  const last = segments[segments.length - 1] || 'index'
  const dir = segments.slice(0, -1).join('/')
  return `~/portfolio/${dir ? dir + '/' : ''}${last || 'index'}.md`
})
</script>

<template>
  <!-- ── Desktop header ── -->
  <header class="ide-header">
    <div class="ide-header-left">
      <div class="traffic-lights">
        <span class="tl tl-red"    />
        <span class="tl tl-yellow" />
        <span class="tl tl-green"  />
      </div>
      <span class="ide-filepath">{{ filePath }}</span>
    </div>

    <nav class="ide-nav" aria-label="Site navigation">
      <a
        v-for="item in nav"
        :key="item.link"
        :href="item.link"
        class="ide-nav-cmd"
        :class="{ active: isActive(item.link) }"
      >
        <span class="cmd-dollar">$</span>
        <span class="cmd-verb"> cd </span>
        <span class="cmd-arg">{{ item.cmd }}</span>
      </a>
    </nav>

    <!-- Mobile hamburger -->
    <button
      class="ide-hamburger"
      :class="{ open: mobileOpen }"
      @click="mobileOpen = !mobileOpen"
      aria-label="Toggle navigation"
    >
      <span /><span /><span />
    </button>
  </header>

  <!-- ── Mobile nav dropdown ── -->
  <div v-if="mobileOpen" class="ide-mobile-nav" @click="mobileOpen = false">
    <a
      v-for="item in nav"
      :key="item.link"
      :href="item.link"
      class="ide-mobile-cmd"
      :class="{ active: isActive(item.link) }"
    >
      <span class="cmd-dollar">$</span>
      <span class="cmd-verb"> cd </span>
      <span class="cmd-arg">{{ item.cmd }}</span>
    </a>
  </div>
</template>
