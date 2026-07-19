<template>
  <div class="term-block">
    <div class="term-prompt-line">
      <span class="p-dollar">$ </span><span class="p-cmd">cat stats.json</span>
    </div>
    <div class="term-output">
      <div class="json-brace">{</div>
      <div class="json-line">
        <span class="json-key">&nbsp;&nbsp;"sql_optimization"</span><span class="json-punc">: </span><span class="json-str-green">"30 min → 5 min"</span><span class="json-punc">,</span>
        <span class="json-comment">  // 3M records, 5-table join</span>
      </div>
      <div class="json-line">
        <span class="json-key">&nbsp;&nbsp;"delivery_rate"</span><span class="json-punc">:    </span><span class="json-str-green">"80%"</span><span class="json-punc">,</span>
        <span class="json-comment">     // on-schedule across all projects at FPT Software</span>
      </div>
      <div class="json-line">
        <span class="json-key">&nbsp;&nbsp;"largest_team"</span><span class="json-punc">:     </span><span class="json-num">206</span><span class="json-punc">,</span>
        <span class="json-comment">       // Project Lead / Team Lead role</span>
      </div>
      <div class="json-line">
        <span class="json-key">&nbsp;&nbsp;"client_domains"</span><span class="json-punc">:   </span><span class="json-punc">[</span><span class="json-str">"Finance"</span><span class="json-punc">, </span><span class="json-str">"Insurance"</span><span class="json-punc">, </span><span class="json-str">"Asset Mgmt"</span><span class="json-punc">, </span><span class="json-str">"IT"</span><span class="json-punc">, </span><span class="json-str">"Commerce"</span><span class="json-punc">]</span>
      </div>
      <div class="json-brace">}</div>
    </div>
  </div>
</template>
