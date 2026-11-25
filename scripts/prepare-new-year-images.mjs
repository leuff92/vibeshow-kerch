import { copyFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import sharp from 'sharp'

const sourceDirectory = process.argv[2]

if (!sourceDirectory) {
  throw new Error('Pass the directory containing the November 2026 New Year posters.')
}

const outputDirectory = fileURLToPath(new URL('../public/images/new-year/', import.meta.url))
const posters = [
  ['events', 'photo_2026-11-09_00-57-23.jpg'],
  ['trees', 'photo_2026-11-09_00-57-24.jpg'],
  ['hostess', 'photo_2026-11-09_00-57-22 (2).jpg'],
  ['residence', 'photo_2026-11-09_00-57-22.jpg'],
  ['grinch', 'photo_2026-11-09_00-57-21.jpg'],
]

await mkdir(outputDirectory, { recursive: true })

for (const [id, filename] of posters) {
  const source = join(sourceDirectory, filename)
  await copyFile(source, join(outputDirectory, `${id}.jpg`))

  for (const width of [400, 640, 853]) {
    const output = join(outputDirectory, `${id}-${width}.webp`)
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(output)
    console.log(`${id}-${width}.webp: ${Math.round((await stat(output)).size / 1024)} KB`)
  }
}
