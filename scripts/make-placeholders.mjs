#!/usr/bin/env node
// Generate the built-in placeholder images in public/placeholders/.
// Run once (already committed to the repo): node scripts/make-placeholders.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const OUT = 'public/placeholders'
fs.mkdirSync(OUT, { recursive: true })

const variants = [
  { file: 'home-01.webp', bg: ['#211d1a', '#3a332c'], title: "Your Name", sub: 'FW / 26' },
  { file: 'home-02.webp', bg: ['#1c1e22', '#33373f'], title: "Your Name", sub: 'Campaign' },
  { file: 'home-03.webp', bg: ['#241f20', '#453a3b'], title: "Your Name", sub: 'Editorial' },
  { file: 'project-a.webp', bg: ['#221f1c', '#3c362f'], title: 'Project', sub: '01' },
  { file: 'project-b.webp', bg: ['#1e2126', '#383d46'], title: 'Project', sub: '02' },
  { file: 'project-c.webp', bg: ['#26211f', '#4a4038'], title: 'Project', sub: '03' },
  { file: 'about-01.webp', bg: ['#201d1b', '#39332d'], title: "Your Name", sub: 'Portrait' },
]

for (const v of variants) {
  const [word1 = 'Your', word2 = 'Name'] = v.title.split(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1800" viewBox="0 0 1440 1800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${v.bg[0]}"/>
      <stop offset="1" stop-color="${v.bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="1800" fill="url(#g)"/>
  <text x="720" y="880" font-family="Futura, 'Century Gothic', sans-serif" font-size="64"
        fill="#efeae2" text-anchor="middle" letter-spacing="18">${word1.toUpperCase()}</text>
  <text x="720" y="960" font-family="Futura, 'Century Gothic', sans-serif" font-size="64"
        fill="#efeae2" text-anchor="middle" letter-spacing="18">${word2.toUpperCase()}</text>
  <text x="720" y="1060" font-family="Futura, 'Century Gothic', sans-serif" font-size="24"
        fill="#b7ada0" text-anchor="middle" letter-spacing="8">${v.sub.toUpperCase()}</text>
</svg>`
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(OUT, v.file))
  console.log(`  ${v.file}`)
}
console.log('Done.')
