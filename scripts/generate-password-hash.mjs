#!/usr/bin/env node
// Generate an ADMIN_PASSWORD_HASH value for Vercel environment variables.
// Usage: npm run password
import crypto from 'node:crypto'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const pw = await rl.question('Choose an admin password (min 8 chars): ')
rl.close()

if (pw.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync(pw, salt, 64).toString('hex')

console.log('\nAdd this to Vercel (Project → Settings → Environment Variables):')
console.log(`\n  ADMIN_PASSWORD_HASH=${salt}:${hash}`)
console.log('\nAlso add SESSION_SECRET:')
console.log(`  SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`)
