<script setup>
const groups = [
  {
    dir: 'backend',
    items: ['java-expert-6y+', 'spring-boot-4y', 'spring-mvc', 'jboss-3y6m', 'mybatis'],
  },
  {
    dir: 'frontend',
    items: ['reactjs-5y', 'angular-4y6m', 'typescript-4y', 'angularjs-2y10m', 'javascript'],
  },
  {
    dir: 'database',
    items: ['postgresql-expert-6y+', 'oracle-plsql-3y', 'oracle-db-2y6m', 'sql'],
  },
  {
    dir: 'cloud',
    items: ['aws-codepipeline', 'aws-ec2-elb', 'docker', 'kubernetes', 'github-actions'],
  },
  {
    dir: 'low-code',
    items: ['mendix-advanced-certified', 'mendix-rapid-certified', 'pega-csa-certified'],
  },
]
</script>

<template>
  <div class="term-block">
    <div class="term-prompt-line">
      <span class="p-dollar">$ </span><span class="p-cmd">ls stack/</span>
    </div>
    <div class="term-output">
      <div v-for="g in groups" :key="g.dir" class="ls-group">
        <div class="ls-dir-row">
          <span class="ls-perms">drwxr-xr-x</span>
          <span class="ls-dir-name">{{ g.dir }}/</span>
        </div>
        <div class="ls-files-row">
          <span v-for="f in g.items" :key="f" class="ls-file">{{ f }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
