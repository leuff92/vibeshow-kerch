import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const directory = resolve(process.argv[2] ?? 'output/leads-setup')
const password = randomBytes(18).toString('base64url')
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const { x, y, d } = privateKey.export({ format: 'jwk' })
const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]).toString('base64url')
const passwordHash = createHash('sha256').update(password).digest('hex')

// Refuse to replace existing credentials and invalidate enrolled devices.
mkdirSync(resolve(directory, '..'), { recursive: true })
mkdirSync(directory, { mode: 0o700 })
writeFileSync(join(directory, 'leads.ini'), `PASSWORD_HASH=${passwordHash}\nVAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${d}\n`, { flag: 'wx', mode: 0o600 })
writeFileSync(join(directory, 'password.txt'), `${password}\n`, { flag: 'wx', mode: 0o600 })
console.log(directory)
