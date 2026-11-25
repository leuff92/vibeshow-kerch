import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('dist')
const vendor = resolve('server/push/vendor')
if (!existsSync(resolve(dist, 'leads/index.html')) || !existsSync(resolve(vendor, 'autoload.php'))) {
  throw new Error('Run the Vite build and install the dependencies in server/push with Composer first.')
}
const entries = readdirSync(dist)
if (entries.some((name) => name.startsWith('.env')) || existsSync(resolve(dist, 'api/leads/data'))) {
  throw new Error('Refusing to package private files or stored leads.')
}
cpSync(vendor, resolve(dist, 'api/leads/vendor'), { recursive: true })
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
const zip = resolve(`timeweb-upload-vibeshow-iphone-${stamp}.zip`)
const result = spawnSync('tar', ['-a', '-c', '-f', zip, '-C', dist, ...entries], { stdio: 'inherit' })
if (result.status !== 0) throw result.error ?? new Error(`Archive failed: ${result.status}`)
console.log(zip)
