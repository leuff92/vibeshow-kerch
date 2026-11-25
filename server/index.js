import 'dotenv/config'

import express from 'express'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 3001)
const backupFilePath = process.env.LEADS_BACKUP_FILE || join(dirname(fileURLToPath(import.meta.url)), 'data', 'leads-backup.json')
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://vibeshow-kerch.ru'
const devOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i
const rateLimitWindowMs = 15 * 60 * 1000
const rateLimitMaxRequests = 5
const requestTimestampsByIp = new Map()
let pendingBackup = Promise.resolve()

app.set('trust proxy', true)

app.use((req, res, next) => {
  const origin = req.headers.origin
  const originAllowed = isOriginAllowed(origin)

  if (originAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.sendStatus(originAllowed ? 204 : 403)
    return
  }

  if (!originAllowed) {
    res.status(403).json({ ok: false, error: 'Request origin is not allowed' })
    return
  }

  next()
})

app.use(express.json({ limit: '32kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/leads', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const honeypotValue = cleanText(body.website, 200)

    if (honeypotValue) {
      res.json({ ok: true })
      return
    }

    const clientIp = getClientIp(req)

    if (isRateLimited(clientIp)) {
      res.status(429).json({ ok: false, error: 'Too many requests' })
      return
    }

    const lead = normalizeLead(body)

    if (lead.childrenCount !== null && (!Number.isSafeInteger(lead.childrenCount) || lead.childrenCount < 1)) {
      res.status(400).json({ ok: false, error: 'Invalid children count' })
      return
    }

    if (!lead.programName) {
      res.status(400).json({ ok: false, error: 'Invalid lead data' })
      return
    }

    if (lead.consentAccepted !== true) {
      res.status(400).json({ ok: false, error: 'Invalid lead data' })
      return
    }

    if (!phoneLooksValid(lead.parentPhone)) {
      res.status(400).json({ ok: false, error: 'Invalid lead data' })
      return
    }

    try {
      const save = pendingBackup.then(() => saveLeadBackup({
        ...lead,
        clientIp,
        backupReason: 'local_lead_storage',
        savedAt: new Date().toISOString(),
      }))
      pendingBackup = save.catch(() => {})
      await save
      console.warn(`Lead saved to backup file: ${backupFilePath}`)
      res.json({ ok: true, savedToBackup: true })
    } catch (backupError) {
      console.error('Lead backup save failed.', getErrorLog(backupError))
      res.status(502).json({ ok: false, error: 'Lead submit failed' })
    }
  } catch (error) {
    console.error('Unexpected lead handler error.', getErrorLog(error))
    res.status(500).json({ ok: false, error: 'Lead submit failed' })
  }
})

app.listen(port, () => {
  console.log(`Lead backend is listening on port ${port}`)
})

function isOriginAllowed(origin) {
  if (!origin) {
    return true
  }

  if (origin === allowedOrigin) {
    return true
  }

  return devOriginPattern.test(origin)
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return req.ip || req.socket.remoteAddress || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const timestamps = (requestTimestampsByIp.get(ip) || []).filter((timestamp) => now - timestamp < rateLimitWindowMs)

  if (timestamps.length >= rateLimitMaxRequests) {
    requestTimestampsByIp.set(ip, timestamps)
    return true
  }

  timestamps.push(now)
  requestTimestampsByIp.set(ip, timestamps)
  return false
}

function normalizeLead(body) {
  return {
    programId: cleanText(body.programId, 80),
    programName: cleanText(body.programName, 160),
    programPrice: cleanText(body.programPrice, 80),
    bookingPrice: cleanText(body.bookingPrice, 80),
    date: cleanText(body.date, 40),
    time: cleanText(body.time, 40),
    parentName: cleanText(body.parentName, 120),
    childName: cleanText(body.childName, 120),
    childAge: cleanText(body.childAge, 20),
    childrenCount: body.childrenCount ?? null,
    parentPhone: cleanText(body.parentPhone, 40),
    comment: cleanMultilineText(body.comment, 1000),
    pageUrl: cleanUrl(body.pageUrl),
    createdAt: normalizeCreatedAt(body.createdAt),
    consentAccepted: body.consentAccepted === true,
  }
}

function cleanText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[<>`]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function cleanMultilineText(value, maxLength = 1000) {
  return String(value ?? '')
    .replace(/[<>`]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength)
}

function cleanUrl(value) {
  const text = cleanText(value, 500)

  if (!text) {
    return ''
  }

  try {
    const url = new URL(text)

    return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, 500) : ''
  } catch {
    return ''
  }
}

function normalizeCreatedAt(value) {
  const parsedDate = new Date(String(value ?? ''))

  return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString()
}

function phoneLooksValid(value) {
  const digits = value.replace(/\D/g, '')

  return digits.length >= 10 && digits.length <= 15
}

async function saveLeadBackup(lead) {
  await mkdir(dirname(backupFilePath), { recursive: true })

  let leads = []

  try {
    const rawBackup = await readFile(backupFilePath, 'utf8')
    leads = rawBackup.trim() ? JSON.parse(rawBackup) : []

    if (!Array.isArray(leads)) {
      throw new Error('Invalid lead backup format')
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }

  leads.push(lead)
  const temporaryFile = `${backupFilePath}.tmp`
  await writeFile(temporaryFile, JSON.stringify(leads, null, 2), 'utf8')
  await rename(temporaryFile, backupFilePath)
}

function getErrorLog(error) {
  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: 'Unknown error' }
}

setInterval(() => {
  const now = Date.now()

  for (const [ip, timestamps] of requestTimestampsByIp.entries()) {
    const freshTimestamps = timestamps.filter((timestamp) => now - timestamp < rateLimitWindowMs)

    if (freshTimestamps.length) {
      requestTimestampsByIp.set(ip, freshTimestamps)
    } else {
      requestTimestampsByIp.delete(ip)
    }
  }
}, rateLimitWindowMs).unref()
