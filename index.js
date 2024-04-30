import Database from 'better-sqlite3'
import fs from 'node:fs/promises'
import { parse } from 'ini'

import { mkdirIfNecessary, find } from './file.js'
// import { pp } from 'passprint'
import util from 'util'
import childProcess from 'child_process'

const exec = util.promisify(childProcess.exec)

const databasePath = await find('writefreely.db')
const configPath = databasePath.replace(/writefreely\.db$/, 'config.ini')
const imgPath = databasePath.replace(/writefreely\.db$/, 'static/img')
console.log(`Database path: ${databasePath}`)

const configText = await fs.readFile(configPath, { encoding: 'utf-8' })
const configIni = parse(configText)
const config = {
  siteName: configIni.app.site_name,
  siteDescription: configIni.app.site_description,
  host: configIni.app.host
}

const db = new Database(databasePath, { readonly: true, fileMustExist: true })

const selectPosts = db.prepare(`
SELECT id, slug, title, created, content
FROM posts
WHERE pinned_position IS NULL AND slug IS NOT NULL
ORDER BY created DESC
`)
const selectDrafts = db.prepare(`
SELECT id, slug, title, created, content
FROM posts
WHERE pinned_position IS NULL AND slug IS NULL
ORDER BY created DESC
`)
const selectPages = db.prepare(`
SELECT id, slug, title, content
FROM posts
WHERE pinned_position IS NOT NULL
ORDER BY pinned_position
`)

const contentDir = 'content'
const postsDir = `${contentDir}/posts`
const pagesDir = `${contentDir}/pages`
const draftsDir = `${contentDir}/drafts`
const imgDir = `${contentDir}/img`
for (const dir of [contentDir, postsDir, pagesDir, draftsDir, imgDir]) {
  await mkdirIfNecessary(dir)
}

const slugSet = new Set()
function uniqueSlug (slug, id) {
  let actualSlug = slug || id // Use id if slug is empty
  while (slugSet.has(actualSlug)) {
    actualSlug += '_'
  }
  slugSet.add(actualSlug)
  return actualSlug
}

function extractFrontMatter (inputMarkdown) {
  const lines = inputMarkdown.split('\n')
  const frontMatter = {}
  let i = 0
  if (lines[i] === '---') {
    i++
    while (lines[i] !== '---') {
      const [key, value] = lines[i].split(': ')
      frontMatter[key] = value
      i++
    }
    i++
  }
  const markdown = lines.slice(i).join('\n')
  return { frontMatter, markdown }
}

const frontMatterText = obj =>
    `---  \n${Object.entries(obj)
        .filter(([k, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    }\n---  \n`

console.log(`Writing to ${contentDir}/`)

// Extract maekdown from DB and write to separate files, one per post,
// with all the writes happening aynchronously in parallel
const promises = []
promises.push(exec(`cp -r ${imgPath} ${imgDir}`))
promises.push(fs.writeFile(`${contentDir}/config.json`, JSON.stringify(config, null, 2)))

for (const { id, slug, title, content } of selectPages.iterate()) {
  const { frontMatter, markdown } = extractFrontMatter(content)
  const actualSlug = uniqueSlug(slug || frontMatter.slug, id)
  const actualTitle = title || frontMatter.title || slug || 'Post'
  const metadata = {
    slug: actualSlug,
    title: actualTitle
  }
  promises.push(fs.writeFile(`${pagesDir}/${actualSlug}.md`,
    frontMatterText(metadata) + markdown))
}

for (const { id, slug, title, created, content } of selectPosts.iterate()) {
  const { frontMatter, markdown } = extractFrontMatter(content)
  const prelude = []
  if (frontMatter.image && frontMatter.ref) {
    prelude.push(`[![image](${frontMatter.image})](${frontMatter.ref})`)
    prelude.push(' ')
  } else if (frontMatter.image) {
    prelude.push(`![image](${frontMatter.image})`)
    prelude.push(' ')
  } else if (frontMatter.ref) {
    prelude.push(`[Reference](${frontMatter.ref})`)
    prelude.push(' ')
  }
  const actualSlug = uniqueSlug(slug || frontMatter.slug, id)
  const actualTitle = title || frontMatter.title || slug || 'Post'
  const metadata = {
    slug: actualSlug,
    title: actualTitle,
    created: created || frontMatter.date,
    ref: frontMatter.ref,
    image: frontMatter.image
  }
  promises.push(fs.writeFile(`${postsDir}/${actualSlug}.md`,
    frontMatterText(metadata) + prelude.join('\n') + markdown))
}

for (const { id, slug, title, created, content } of selectDrafts.iterate()) {
  const { frontMatter, markdown } = extractFrontMatter(content)
  const actualSlug = uniqueSlug(slug || frontMatter.slug, id)
  const actualTitle = title || frontMatter.title || slug || 'Post'
  const metadata = {
    slug: actualSlug,
    title: actualTitle,
    created: created || frontMatter.date
  }
  promises.push(fs.writeFile(`${draftsDir}/${actualSlug}.md`,
    frontMatterText(metadata) + markdown))
}

await Promise.all(promises)
