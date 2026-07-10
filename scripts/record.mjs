// Record one full animation loop of a diagram to video, for embedding
// where scripts can't run (slides, email, locked-down wikis).
//
//   node scripts/record.mjs sonic
//   node scripts/record.mjs pipeline "theme=red&move=kick"
//   node scripts/record.mjs all
//
// Requires the dev server on :5199 and ffmpeg (for the .mp4 remux).
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'

const LOOP_MS = { pipeline: 15700, generalist: 22000, sonic: 43300 }
const [, , which = 'all', extra = ''] = process.argv
const targets = which === 'all' ? Object.keys(LOOP_MS) : [which]

mkdirSync('recordings', { recursive: true })

for (const name of targets) {
  if (!(name in LOOP_MS)) {
    console.error(`unknown diagram "${name}" — use ${Object.keys(LOOP_MS).join('/')}`)
    process.exit(1)
  }
  const dir = `recordings/.tmp-${name}`
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--headless=new'],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  })
  const page = await context.newPage()
  const params = extra ? `&${extra}` : ''
  await page.goto(`http://localhost:5199/?embed=${name}${params}`, {
    waitUntil: 'networkidle',
  })
  // One full loop plus a beat on either side.
  await page.waitForTimeout(LOOP_MS[name] + 1500)
  await context.close()
  await browser.close()

  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'))
  renameSync(`${dir}/${webm}`, `recordings/${name}.webm`)
  rmSync(dir, { recursive: true, force: true })
  try {
    execSync(
      `ffmpeg -y -loglevel error -i recordings/${name}.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart recordings/${name}.mp4`,
    )
    console.log(`recorded recordings/${name}.webm + .mp4`)
  } catch {
    console.log(`recorded recordings/${name}.webm (ffmpeg mp4 remux failed)`)
  }
}
