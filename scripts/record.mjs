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

// Loop length, embed query, and a viewport that fits the caption-less
// card at 1200px wide (svg scale ≈ 1.1833 + 58px chrome).
const DIAGRAMS = {
  pipeline: { loop: 15700, height: 410, query: 'embed=pipeline&caption=off' },
  'pipeline-red': { loop: 15700, height: 410, query: 'embed=pipeline&theme=red&move=kick&caption=off' },
  generalist: { loop: 22000, height: 462, query: 'embed=generalist&caption=off' },
  sonic: { loop: 43300, height: 476, query: 'embed=sonic&caption=off' },
  extraction: { loop: 20900, height: 474, query: 'embed=extraction&caption=off' },
  deployment: { loop: 21600, height: 510, query: 'embed=deployment&caption=off' },
  vla: { loop: 23800, height: 606, query: 'embed=vla&caption=off' },
  e2e: { loop: 18200, height: 322, query: 'embed=e2e&caption=off' },
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
  const { loop, height, query } = DIAGRAMS[name]
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
  await page.goto(`http://localhost:5199/?${query}${params}`, {
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
