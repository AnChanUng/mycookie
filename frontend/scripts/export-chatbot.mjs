import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CS_NOTES } from '../src/data/csNotes.js'
import { WEB_ESSENTIALS } from '../src/data/webEssentials.js'

const base = new URL('../../backend/src/main/resources/', import.meta.url)
const rows = []
function add(source, title, url, body) {
  const text = body.trim()
  for (let start = 0; start < text.length;) {
    const limit = Math.min(start + 1100, text.length)
    const split = text.lastIndexOf('\n', limit)
    const end = limit === text.length || split < start + 650 ? limit : split
    rows.push({source, title, url, text: title + '\n' + text.slice(start, end)})
    if (end === text.length) break
    start = end - 150
  }
}
// Only reviewed file paths in this manifest can enter the learning corpus.
const manifest = fs.readFileSync(new URL('./chatbot-public-files.txt', import.meta.url),'utf8').trim().split(/\r?\n/)
for (const source of manifest) {
  if (!/^(algorithm|data-structure|database|java|network|operating-system|software-engineering|spring)\/[0-9]+-[a-z0-9-]+\.md$/.test(source)) throw Error(source)
  const md = fs.readFileSync(new URL('content/' + source, base), 'utf8').replaceAll('\r\n', '\n')
  const title = md.match(/^title: (.+)$/m)?.[1].replace(/^"|"$/g,'')
  if (!title) throw Error(source)
  add(source, title, '/cs', md.replace(/^---[\s\S]*?---/, ''))
}
for (const [sections, route] of [[[WEB_ESSENTIALS], '/web-essentials'], [CS_NOTES,'/notes']]) {
  for (const section of sections) for (const item of section.items) {
    add(route + '/' + item.id, item.title, route + '#' + item.id, item.question + '\n' + item.answer)
  }
}
const guides = JSON.parse(fs.readFileSync(new URL('chatbot/guides.json',base)))
for (const g of guides) add('guide/' + g.url.slice(1),g.title,g.url,g.text)
const output = fileURLToPath(new URL('chatbot/public.json',base))
const serialized = JSON.stringify(rows)
if (process.argv.includes('--check')) {
  if (fs.readFileSync(output,'utf8') !== serialized) throw Error('공개 검색 자료를 다시 생성하세요.')
} else fs.writeFileSync(output, serialized)
console.log(rows.length + ' public chunks')
