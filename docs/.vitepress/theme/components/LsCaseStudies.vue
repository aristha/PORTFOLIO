<script setup>
import { withBase } from 'vitepress'
const studies = [
  {
    file: 'ai-assisted-engineering-governance',
    link: '/case-studies/ai-assisted-engineering-governance',
    result: 'AI-assisted change → deterministic evidence → independent review → human gate',
    meta: 'Repository-native governance · active reference implementation',
  },
  {
    file: 'legacy-java-aws-migration',
    link: '/case-studies/legacy-java-aws-migration',
    result: 'Java EE monolith → AWS re-platforming strategy',
    meta: 'Migration architecture · phased delivery · risk control',
  },
  {
    file: 'enterprise-architecture-redesign',
    link: '/case-studies/enterprise-architecture-redesign',
    result: 'Monolith decomposition → modular architecture',
    meta: 'Domain boundaries · release independence · incremental modernization',
  },
  {
    file: 'sql-performance-optimization',
    link: '/case-studies/sql-performance-optimization',
    result: 'Query time 30 min → 5 min on 3M-row dataset',
    meta: '5-table join · index strategy · execution-plan analysis',
  },
  {
    file: 'multi-technology-integration',
    link: '/case-studies/multi-technology-integration',
    result: 'Cross-stack integration and API boundary design',
    meta: 'Java · React · Python · enterprise integration',
  },
  {
    file: 'technical-bidding',
    link: '/case-studies/technical-bidding',
    result: 'Structured solution evaluation for enterprise proposals',
    meta: 'Build-vs-buy · architecture trade-offs · delivery constraints',
  },
]
</script>

<template>
  <div class="term-block">
    <div class="term-prompt-line">
      <span class="p-dollar">$ </span><span class="p-cmd">ls case-studies/</span>
    </div>
    <div class="term-output">
      <a
        v-for="cs in studies"
        :key="cs.file"
        :href="withBase(cs.link)"
        class="ls-cs-row"
      >
        <span class="ls-perms">-rw-r--r--</span>
        <span class="ls-cs-file">{{ cs.file }}.md</span>
        <span class="ls-cs-comment">  # {{ cs.result }}</span>
      </a>
    </div>
  </div>
</template>