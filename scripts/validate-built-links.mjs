import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('docs/.vitepress/dist')
const expectedBase = '/PORTFOLIO/'
const violations = []

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
      continue
    }
    if (!entry.name.endsWith('.html')) continue

    const html = await readFile(full, 'utf8')
    const hrefRegex = /href="(\/[^"#?]*)/g
    for (const match of html.matchAll(hrefRegex)) {
      const href = match[1]
      if (href.startsWith(expectedBase)) continue
      violations.push({
        file: path.relative(root, full),
        href,
      })
    }
  }
}

await walk(root)

if (violations.length > 0) {
  console.error('Found root-absolute internal links that bypass the GitHub Pages base path:')
  for (const item of violations) {
    console.error(`- ${item.file}: ${item.href}`)
  }
  process.exit(1)
}

console.log(`Built-link validation passed: internal root links use ${expectedBase}`)
