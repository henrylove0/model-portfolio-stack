#!/usr/bin/env node
// Build the link-preview image (public/og.jpg, 1200x630) shown when the site is shared on
// Instagram, WhatsApp, iMessage, X, etc.: three photos side by side, each cropped to fill
// its third (sharp's attention crop keeps the subject in frame).
//
//   npm run og -- photo1.jpg photo2.webp photo3.jpg
import sharp from 'sharp'

const photos = process.argv.slice(2)
if (photos.length !== 3) {
  console.error('Usage: npm run og -- <photo1> <photo2> <photo3>')
  process.exit(1)
}

const W = 1200
const H = 630
const GAP = 6
const tile = Math.floor((W - GAP * 2) / 3)

const tiles = await Promise.all(
  photos.map((p) =>
    sharp(p).resize(tile, H, { fit: 'cover', position: sharp.strategy.attention }).toBuffer(),
  ),
)

await sharp({ create: { width: W, height: H, channels: 3, background: '#0d0c0a' } })
  .composite(tiles.map((input, i) => ({ input, left: i * (tile + GAP), top: 0 })))
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/og.jpg')

console.log('Wrote public/og.jpg (1200x630)')
