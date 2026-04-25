# Enterprise Engineering — ADR & Case Studies

Architecture Decision Records, Case Studies, and Technical Leadership documentation site built with [VitePress](https://vitepress.dev/).

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview   # preview production build locally
```

## GitHub Pages Deployment

This site deploys automatically via GitHub Actions on every push to `main`.

**Before deploying, update `base` in `docs/.vitepress/config.js`:**

```js
base: '/your-repo-name/',   // match your GitHub repository name
```

Then enable GitHub Pages in your repository settings → Pages → Source: **GitHub Actions**.

## Structure

```
docs/
├── .vitepress/
│   ├── config.js           # VitePress configuration, nav, sidebar
│   └── theme/
│       ├── index.js        # Theme extension
│       └── custom.css      # Enterprise documentation styles
├── index.md                # Home page
├── case-studies.md         # Case studies index
├── case-studies/
│   ├── legacy-java-aws-migration.md
│   ├── sql-performance-optimization.md
│   ├── multi-technology-integration.md
│   ├── enterprise-architecture-redesign.md
│   └── technical-bidding.md
├── philosophy.md           # Engineering philosophy
└── about.md                # About / background
```
