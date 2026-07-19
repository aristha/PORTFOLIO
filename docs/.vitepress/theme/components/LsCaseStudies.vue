<script setup>
const studies = [
  {
    file: 'legacy-java-aws-migration',
    link: '/case-studies/legacy-java-aws-migration',
    result: 'Java EE 6 monolith → AWS ECS Fargate + Aurora PostgreSQL',
    meta: '800K txn/mo · 15yr codebase · 18-month migration',
  },
  {
    file: 'enterprise-architecture-redesign',
    link: '/case-studies/enterprise-architecture-redesign',
    result: 'Monolith decomposition → modular architecture',
    meta: '600K LOC · 8-week → 2-week release cycle',
  },
  {
    file: 'sql-performance-optimization',
    link: '/case-studies/sql-performance-optimization',
    result: 'Query time 30 min → 5 min on 3M-row dataset',
    meta: '5-table join · index strategy · execution plan analysis',
  },
  {
    file: 'multi-technology-integration',
    link: '/case-studies/multi-technology-integration',
    result: 'Java + Mendix + Pega + ReactJS cross-system integration',
    meta: 'Heterogeneous enterprise stack · API contract design',
  },
  {
    file: 'technical-bidding',
    link: '/case-studies/technical-bidding',
    result: 'Solution architecture for competitive enterprise bids',
    meta: 'Financial · Insurance · Asset Mgmt client proposals',
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
        :href="cs.link"
        class="ls-cs-row"
      >
        <span class="ls-perms">-rw-r--r--</span>
        <span class="ls-cs-file">{{ cs.file }}.md</span>
        <span class="ls-cs-comment">  # {{ cs.result }}</span>
      </a>
    </div>
  </div>
</template>
