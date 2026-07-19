import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import WhoAmI from './components/WhoAmI.vue'
import StatsJson from './components/StatsJson.vue'
import LsStack from './components/LsStack.vue'
import LsCaseStudies from './components/LsCaseStudies.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('WhoAmI', WhoAmI)
    app.component('StatsJson', StatsJson)
    app.component('LsStack', LsStack)
    app.component('LsCaseStudies', LsCaseStudies)
  }
}
