import { defineConfig } from 'vitepress'

// Set base URL for GitHub Pages: change '/PORTFOLIO/' to match your repo name
const base = process.env.GITHUB_ACTIONS ? '/PORTFOLIO/' : '/'

export default defineConfig({
  title: 'Enterprise Engineering',
  description: 'Architecture Decision Records, System Migration Case Studies, and Technical Leadership',
  base,
  cleanUrls: true,

  appearance: 'force-dark',

  head: [
    ['meta', { name: 'author', content: 'Ha Van Tam' }],
    ['meta', { name: 'keywords', content: 'Ha Van Tam, Tech Lead, Java, AWS, PostgreSQL, Oracle, Spring Boot, Architecture, Migration, Performance, Enterprise, FPT Software' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Ha Van Tam — Tech Lead & Solution Architect' }],
    ['meta', { property: 'og:description', content: 'Architecture Decision Records and Case Studies by Ha Van Tam — 8 years of enterprise-scale system design, cloud migration, and performance engineering.' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    siteTitle: 'Enterprise Engineering',

    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Case Studies',
        link: '/case-studies',
        activeMatch: '/case-studies'
      },
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'About', link: '/about' },
      { text: '📄 CV', link: '/cv' }
    ],

    sidebar: {
      '/case-studies': [
        {
          text: 'Overview',
          items: [
            { text: 'All Case Studies', link: '/case-studies' }
          ]
        },
        {
          text: 'Migration & Cloud',
          collapsed: false,
          items: [
            {
              text: 'Legacy Java → AWS Cloud',
              link: '/case-studies/legacy-java-aws-migration'
            },
            {
              text: 'Monolith → Modular Architecture',
              link: '/case-studies/enterprise-architecture-redesign'
            }
          ]
        },
        {
          text: 'Performance Engineering',
          collapsed: false,
          items: [
            {
              text: 'SQL Performance Optimization',
              link: '/case-studies/sql-performance-optimization'
            }
          ]
        },
        {
          text: 'Integration & Decision',
          collapsed: false,
          items: [
            {
              text: 'Multi-Technology Integration',
              link: '/case-studies/multi-technology-integration'
            },
            {
              text: 'Technical Bidding & Proposal',
              link: '/case-studies/technical-bidding'
            }
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aristha' }
    ],

    footer: {
      message: 'Ha Van Tam · Tech Lead & Solution Architect · <a href="mailto:bttsnam@gmail.com">bttsnam@gmail.com</a>'
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    }
  },

  markdown: {
    lineNumbers: false,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
