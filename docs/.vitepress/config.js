import { defineConfig } from 'vitepress'

// Set base URL for GitHub Pages: change '/PORTFOLIO/' to match your repo name
const base = process.env.GITHUB_ACTIONS ? '/PORTFOLIO/' : '/'

export default defineConfig({
  title: 'Enterprise Engineering',
  description: 'Architecture Decision Records, System Migration Case Studies, and Technical Leadership',
  base,

  head: [
    ['meta', { name: 'author', content: 'Technical Architect & Tech Lead' }],
    ['meta', { name: 'keywords', content: 'Java, AWS, PostgreSQL, Oracle, Spring Boot, Architecture, Migration, Performance, Enterprise' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Enterprise Engineering — ADR & Case Studies' }],
    ['meta', { property: 'og:description', content: 'Architecture Decision Records and Case Studies from enterprise-scale system design, migration, and performance engineering.' }],
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
      { text: 'About', link: '/about' }
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

    footer: {
      message: 'Enterprise Engineering — Architecture Decision Records & Case Studies'
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
