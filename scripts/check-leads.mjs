import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const demo = process.argv.includes('--preview')
const php = process.env.PHP_BIN || 'php'
const phpArgs = (process.env.PHP_EXTENSION_DIR ? ['-d', `extension_dir="${process.env.PHP_EXTENSION_DIR}"`] : [])
  .concat((process.env.PHP_LOAD_EXTENSIONS || '').split(',').filter(Boolean).flatMap((name) => ['-d', `extension=${name}`]))
const port = demo ? 8787 : 8789
const origin = `http://127.0.0.1:${port}`
const base = mkdtempSync(join(tmpdir(), 'vibeshow-leads-'))
const www = join(base, 'public_html')
const privateDir = join(base, 'vibeshow-private')
const data = join(www, 'api/leads/data')
for (const path of ['leads', 'assets', 'api/leads', 'favicon.svg', 'favicon-48x48.png', 'favicon-180x180.png']) {
  cpSync(resolve('dist', path), join(www, path), { recursive: true, filter: (name) => !name.endsWith('/data') && !name.endsWith('\\data') })
}
mkdirSync(data)
const setup = spawnSync(process.execPath, ['scripts/setup-leads.mjs', privateDir])
assert.equal(setup.status, 0, setup.stderr?.toString())
const password = demo ? 'demo-vibeshow-2027' : readFileSync(join(privateDir, 'password.txt'), 'utf8').trim()
if (demo) {
  const config = join(privateDir, 'leads.ini')
  writeFileSync(config, readFileSync(config, 'utf8').replace(/PASSWORD_HASH=.+/, `PASSWORD_HASH=${createHash('sha256').update(password).digest('hex')}`))
}
writeFileSync(join(www, '.env'), 'LEAD_MAIL_TO=\n')
const bookingPath = join(data, 'leads-backup.json')
const rows = Array.from({ length: demo ? 2 : 32 }, (_, i) => ({
  programName: i % 2 === 0 ? 'Хозяйка Нового года' : 'Шоу мыльных пузырей',
  parentName: 'Тестовая заявка', parentPhone: '+7 000 000-00-00', date: '2026-12-27', time: '13:00',
  childrenCount: 9, savedAt: '2026-11-21T20:00:00Z', comment: 'Пробная запись',
  childName: 'Excluded', clientIp: '192.0.2.10',
}))
writeFileSync(bookingPath, JSON.stringify(rows))
const networkOff = 'http://127.0.0.1:1'
const server = spawn(php, [...phpArgs, '-S', `127.0.0.1:${port}`, '-t', www, resolve('scripts/lead-preview.php')], {
  env: { ...process.env, HTTPS_PROXY: networkOff, ALL_PROXY: networkOff, NO_PROXY: 'localhost,127.0.0.1', LEAD_MAIL_TO: '' }, windowsHide: true,
})
let phpLog = ''
server.stderr.on('data', (chunk) => { phpLog += chunk.toString() })
const api = '/api/leads/admin.php'
let cookie = ''
async function request(path = api, payload, from = origin, signedIn = true) {
  const headers = signedIn && cookie ? { Cookie: cookie } : {}
  const body = payload === undefined ? undefined : JSON.stringify(payload)
  if (body) Object.assign(headers, { Origin: from, 'Content-Type': 'application/json' })
  const response = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers, body })
  return [response.status, await response.json(), response.headers]
}

try {
  const online = async () => (await fetch(`${origin}/leads/`).catch(() => null))?.ok
  for (let i = 0; i < 30 && !await online(); i++) await delay(100)
  assert.equal(await online(), true, phpLog)
  if (demo) {
    console.log(`${origin}/leads/ | demo password: ${password}`)
    await new Promise((done) => { process.once('SIGINT', done); server.once('exit', done) })
  } else {
    assert.equal((await request())[0], 401)
    assert.equal((await request(api, { action: 'login', password }, 'https://example.com'))[0], 403)
    assert.equal((await request(api, { action: 'login', password: 'wrong' }))[0], 401)
    const [login, , headers] = await request(api, { action: 'login', password })
    assert.equal(login, 200, phpLog)
    const setCookie = headers.get('set-cookie')
    assert.match(setCookie, /path=\/api\/leads\/; secure; HttpOnly; SameSite=Strict/i)
    cookie = setCookie.split(';', 1)[0]
    const [listed, list, listHeaders] = await request()
    assert.equal(listed, 200)
    assert.match(listHeaders.get('cache-control'), /no-store/)
    assert.equal(list.leads.length, 30)
    assert.equal(list.leads[0].key, 31)
    assert.equal(list.leads[0].childName, undefined)
    assert.equal(list.leads[0].clientIp, undefined)
    assert.match(list.pushKey, /^[\w-]{87}$/)
    assert.equal((await request(`${api}?before=${list.next}`))[1].leads.length, 2)
    const { x, y } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey.export({ format: 'jwk' })
    const keys = { p256dh: Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]).toString('base64url'), auth: randomBytes(16).toString('base64url') }
    const endpoint = 'https://web.push.apple.com/demo-token'
    assert.equal((await request(api, { action: 'subscribe', endpoint, keys }, origin, false))[0], 401)
    assert.equal((await request(api, { action: 'subscribe', endpoint: 'https://example.com/demo-token', keys }))[0], 400)
    assert.equal((await request(api, { action: 'subscribe', endpoint, keys }))[0], 200)
    assert.equal((await request(api, { action: 'device_status', endpoint }))[1].registered, true)
    assert.equal((await request(api, { action: 'test', endpoint }))[0], 502, phpLog)
    assert.equal((await request(api, { action: 'test', endpoint }))[0], 429)
    const form = { programName: 'Гринчеринка', parentPhone: '+70000000000', childrenCount: 12, consentAccepted: true }
    const [submit, saved] = await request('/api/leads/index.php', form, origin, false)
    assert.equal(submit, 200, phpLog)
    assert.equal(saved.savedToBackup, true)
    assert.equal((await request())[1].leads[0].childrenCount, 12)
    assert.match(phpLog, /Lead push not accepted\. HTTP status: 0/)
    assert.equal((await request(api, { action: 'logout', endpoint }))[0], 200)
    assert.equal((await request())[0], 401)
    assert.equal(Object.keys(JSON.parse(readFileSync(join(privateDir, 'push-devices.json'), 'utf8'))).length, 0)
    console.log('Lead cabinet integration passed: auth, private fields, paging, push refusal, booking and logout.')
  }
} finally {
  const stopped = new Promise((done) => server.once('close', done))
  if (server.exitCode === null) { server.kill(); await stopped }
  rmSync(base, { recursive: true, force: true })
}
