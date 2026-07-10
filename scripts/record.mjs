// Record one full animation loop of a diagram, for contexts where no
// scripts/iframes are allowed (Confluence attachments, slides, email).
// Produces .webm + .mp4 (sharp, click-to-play) and .gif (autoplays and
// loops inline like an image — closest to the live diagram).
//
//   node scripts/record.mjs sonic
//   node scripts/record.mjs pipeline "theme=red&move=kick"
//   node scripts/record.mjs all
//
// Requires the dev server on :5199 and ffmpeg.
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'

// Loop length and a viewport tall enough for card + caption at 1200px.
const DIAGRAMS = {
  pipeline: { loop: 15700, height: 480 },
  generalist: { loop: 22000, height: 535 },
  sonic: { loop: 43300, height: 550 },
}
const WIDTH = 1200
const [, , which = 'all', extra = ''] = process.argv
const targets = which === 'all' ? Object.keys(DIAGRAMS) : [which]

mkdirSync('recordings', { recursive: true })

for (const name of targets) {
  if (!(name in DIAGRAMS)) {
    console.error(`unknown diagram "${name}" — use ${Object.keys(DIAGRAMS).join('/')}`)
    process.exit(1)
  }
  const { loop, height } = DIAGRAMS[name]
  const dir = `recordings/.tmp-${name}`
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--headless=new'],
  })
  const context = await browser.newContext({
    viewport: { width: WIDTH, height },
    recordVideo: { dir, size: { width: WIDTH, height } },
  })
  const page = await context.newPage()
  const params = extra ? `&${extra}` : ''
  await page.goto(`http://localhost:5199/?embed=${name}${params}`, {
    waitUntil: 'networkidle',
  })
  // One full loop plus a small tail.
  await page.waitForTimeout(loop + 1200)
  await context.close()
  await browser.close()

  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'))
  renameSync(`${dir}/${webm}`, `recordings/${name}.webm`)
  rmSync(dir, { recursive: true, force: true })
  const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
  // Trim the white page-load head and cut to exactly one loop, so the
  // GIF's loop seam lands in the diagram's own fade-out reset phase.
  const cut = `-ss 1.2 -t ${(loop / 1000).toFixed(1)}`
  try {
    run(
      `ffmpeg -y -loglevel error ${cut} -i recordings/${name}.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart recordings/${name}.mp4`,
    )
    // Two-pass palette GIF: 12fps, 880px wide — flat vector colors
    // compress well, and the GIF autoplays + loops in wikis.
    run(
      `ffmpeg -y -loglevel error ${cut} -i recordings/${name}.webm -vf "fps=12,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" recordings/${name}.gif`,
    )
    console.log(`recorded recordings/${name}.{webm,mp4,gif}`)
  } catch {
    console.log(`recorded recordings/${name}.webm (ffmpeg conversion failed)`)
  }
}
