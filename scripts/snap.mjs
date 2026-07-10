// Capture the diagram at several points in the animation loop for review.
import { chromium } from 'playwright'

const shots = [
  { t: 600, name: 'videoIn' },
  { t: 2200, name: 'encode' },
  { t: 3900, name: 'form' },
  { t: 5800, name: 'train' },
  { t: 9200, name: 'emit' },
  { t: 12700, name: 'live' },
]

const browser = await chromium.launch({
  executablePath: '/snap/bin/chromium',
  args: ['--headless=new'],
})
const page = await browser.newPage({
  viewport: { width: 1000, height: 900 },
  deviceScaleFactor: 2,
})
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
await page.waitForSelector('.diagram-frame')

const start = Date.now()
for (const shot of shots) {
  const wait = shot.t - (Date.now() - start)
  if (wait > 0) await page.waitForTimeout(wait)
  await page
    .locator('.essay-figure')
    .first()
    .screenshot({ path: `/tmp/diag-${shot.name}.png` })
  console.log(`captured ${shot.name}`)
}

// Second (red) diagram is paused until scrolled into view.
const red = page.locator('.essay-figure').nth(1)
if (await red.count()) {
  await red.scrollIntoViewIfNeeded()
  await page.waitForTimeout(5800)
  await red.screenshot({ path: '/tmp/diag-red-train.png' })
  await page.waitForTimeout(12700 - 5800)
  await red.screenshot({ path: '/tmp/diag-red-live.png' })
  console.log('captured red variant')
}

// Third diagram: the generalist motion policy.
const gen = page.locator('.essay-figure').nth(2)
if (await gen.count()) {
  const genShots = [
    { t: 900, name: 'gen-dataset' },
    { t: 2700, name: 'gen-walk' },
    { t: 6700, name: 'gen-rest' },
    { t: 8900, name: 'gen-deploy' },
    { t: 11500, name: 'gen-ood1' },
    { t: 13400, name: 'gen-ood2' },
    { t: 14900, name: 'gen-wind' },
    { t: 17900, name: 'gen-ood3' },
  ]
  await gen.scrollIntoViewIfNeeded()
  const genStart = Date.now()
  for (const shot of genShots) {
    const wait = shot.t - (Date.now() - genStart)
    if (wait > 0) await page.waitForTimeout(wait)
    await gen.screenshot({ path: `/tmp/diag-${shot.name}.png` })
    console.log(`captured ${shot.name}`)
  }
}

// Fourth diagram: the SONIC encoder–latent–decoder architecture.
const sonic = page.locator('.essay-figure').nth(3)
if (await sonic.count()) {
  const sonicShots = [
    { t: 2500, name: 'sonic-encRobot' },
    { t: 4800, name: 'sonic-actRobot' },
    { t: 8800, name: 'sonic-actSmpl' },
    { t: 11800, name: 'sonic-expand' },
  ]
  await sonic.scrollIntoViewIfNeeded()
  const sonicStart = Date.now()
  for (const shot of sonicShots) {
    const wait = shot.t - (Date.now() - sonicStart)
    if (wait > 0) await page.waitForTimeout(wait)
    await sonic.screenshot({ path: `/tmp/diag-${shot.name}.png` })
    console.log(`captured ${shot.name}`)
  }
}

await page.screenshot({ path: '/tmp/diag-page.png', fullPage: true })
await browser.close()
