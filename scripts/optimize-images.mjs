#!/usr/bin/env node
// Bulk-convert raw photos to web-ready WebP files for the CMS.
//
//   1. Put original photos (JPG/PNG/TIFF) in ./photos-src   (gitignored)
//   2. npm run photos
//   3. Optimized files land in ./r2-upload   (gitignored)
//   4. Drag the r2-upload files into /admin to register them in the site.
//
// Conversion matches what the CMS does in the browser: max 3840px (4K), WebP q85
// with adaptive fallback for very detailed photos.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'photos-src'
const OUT = 'r2-upload'
const MAX_DIM = 3840
const QUALITY = 85
const UPLOAD_CEILING = 4_000_000
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'])

if (!fs.existsSync(SRC)) {
  fs.mkdirSync(SRC)
  console.log(`Created ./${SRC} — drop your original photos there, then re-run.`)
  process.exit(0)
}

fs.mkdirSync(OUT, { recursive: true })
const files = fs
  .readdirSync(SRC)
  .filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()))
  .sort()

if (files.length === 0) {
  console.log(`No images found in ./${SRC}`)
  process.exit(0)
}

let inBytes = 0
let outBytes = 0

for (const file of files) {
  const srcPath = path.join(SRC, file)
  const name = `${path.parse(file).name}.webp`
  const outPath = path.join(OUT, name)
  try {
    const before = fs.statSync(srcPath).size
    await sharp(srcPath)
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath)
    const after = fs.statSync(outPath).size
    inBytes += before
    outBytes += after
    console.log(
      `  ${name}  ${kb(before)} → ${kb(after)}  (−${Math.max(0, Math.round((1 - after / before) * 100))}%)`,
    )
    if (after > UPLOAD_CEILING) {
      console.log(`  ⚠ ${name} is over ~4 MB — the CMS will re-compress it a notch on upload`)
    }
  } catch (err) {
    console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`)
  }
}

console.log(`\n${files.length} file(s) → ./${OUT}`)
console.log(`Total: ${kb(inBytes)} → ${kb(outBytes)}`)
console.log('\nNext: drag these files into /admin (they register in the site automatically).')

function kb(n) {
  return n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}
