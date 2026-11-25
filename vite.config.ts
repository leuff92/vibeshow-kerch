import { defineConfig } from 'vite'
import type { Plugin, ResolvedConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { holidayIndex, holidayProgramPage, holidayPrograms } from './src/holidayPrograms'

const htmlEntry = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const holidayHtmlPages = [holidayIndex, ...holidayPrograms.map(holidayProgramPage)]
const productionOrigin = 'https://vibeshow-kerch.ru'
const apiProxy = {
  '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function holidayMetadata(): Plugin {
  return {
    name: 'holiday-metadata',
    transformIndexHtml(html, { filename }) {
      const page = holidayHtmlPages.find((entry) => normalize(filename) === htmlEntry(`.${entry.path}.html`))
      if (!page) {
        return html
      }
      const fields = {
        '%HOLIDAY_HEADING%': page.heading,
        '%HOLIDAY_TITLE%': page.title,
        '%HOLIDAY_DESCRIPTION%': page.description,
        '%HOLIDAY_CANONICAL%': `${productionOrigin}${page.path}`,
        '%HOLIDAY_IMAGE%': `${productionOrigin}${page.image}`,
      }
      for (const [token, value] of Object.entries(fields)) {
        html = html.replaceAll(token, escapeHtml(value))
      }
      return html
    },
  }
}

function inlineCssAssets() {
  return {
    name: 'inline-css-assets',
    enforce: 'post' as const,
    generateBundle(_options: unknown, bundle: Record<string, any>) {
      const assets = Object.values(bundle)
      const cssAssets = assets.filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'))
      const htmlAssets = assets.filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.html'))

      for (const cssAsset of cssAssets) {
        const href = `/${cssAsset.fileName}`
        const css = String(cssAsset.source).replace(/<\/style/gi, '<\\/style')
        const style = `<style>${css}</style>`
        const stylesheetWithCrossorigin = new RegExp(
          `<link rel="stylesheet" crossorigin href="${escapeRegExp(href)}">`,
          'g',
        )
        const stylesheet = new RegExp(`<link rel="stylesheet" href="${escapeRegExp(href)}">`, 'g')

        for (const htmlAsset of htmlAssets) {
          htmlAsset.source = String(htmlAsset.source)
            .replace(stylesheetWithCrossorigin, style)
            .replace(stylesheet, style)
        }

        delete bundle[cssAsset.fileName]
      }
    },
  }
}

function pruneUploadAssets(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'prune-upload-assets',
    apply: 'build',
    configResolved(config) {
      resolvedConfig = config
    },
    closeBundle() {
      const outDir = resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      const programsDir = join(outDir, 'images', 'programs')

      if (existsSync(programsDir)) {
        for (const fileName of readdirSync(programsDir)) {
          if (fileName.endsWith('.webp') && !fileName.endsWith('-opt.webp')) {
            rmSync(join(programsDir, fileName), { force: true })
          }
        }
      }

      if (existsSync(outDir)) {
        for (const fileName of readdirSync(outDir)) {
          const isLegacyHero = fileName === 'hero-cover.jpg'
          const isLegacyHeroVariant =
            fileName.startsWith('hero-cover-') && !fileName.startsWith('hero-cover-laser-20260505')

          if (isLegacyHero || isLegacyHeroVariant) {
            rmSync(join(outDir, fileName), { force: true })
          }
        }
      }
    },
  }
}

const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com https://mc.webvisor.org https://*.mc.webvisor.org; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com https://mc.webvisor.org https://*.mc.webvisor.org wss://mc.yandex.ru wss://*.mc.yandex.ru wss://mc.yandex.com wss://*.mc.yandex.com wss://mc.webvisor.org wss://*.mc.webvisor.org; frame-src 'self' https://yandex.com https://*.yandex.com https://yandex.ru https://*.yandex.ru https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com https://mc.webvisor.org https://*.mc.webvisor.org; child-src 'self' https://yandex.com https://*.yandex.com https://yandex.ru https://*.yandex.ru https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com https://mc.webvisor.org https://*.mc.webvisor.org",
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    headers: securityHeaders,
    proxy: apiProxy,
  },
  build: {
    rollupOptions: {
      input: {
        main: htmlEntry('./index.html'),
        contacts: htmlEntry('./contacts.html'),
        programs: htmlEntry('./programs.html'),
        gallery: htmlEntry('./gallery.html'),
        reviews: htmlEntry('./reviews.html'),
        cookiePolicy: htmlEntry('./cookie-policy.html'),
        privacyPolicy: htmlEntry('./privacy-policy.html'),
        personalDataConsent: htmlEntry('./personal-data-consent.html'),
        leads: htmlEntry('./leads/index.html'),
        ...Object.fromEntries(holidayHtmlPages.map((page) => [page.path.slice(1), htmlEntry(`.${page.path}.html`)])),
      },
    },
  },
  plugins: [vue(), holidayMetadata(), inlineCssAssets(), pruneUploadAssets()],
})
