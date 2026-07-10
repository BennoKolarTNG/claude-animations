import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--headless=new'] })
const page = await browser.newPage({ viewport: { width: 1100, height: 950 } })
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
const sonic = page.locator('.essay-figure').nth(3)
await sonic.scrollIntoViewIfNeeded()

// Sample limb angles from t=11.4s..14.6s and 21.6s..24.2s (settle+enter windows)
const data = await sonic.evaluate(async (el) => {
  const robot = el.querySelector('g.robot')
  const armL = robot.querySelector('.robot-arm-left')
  const armR = robot.querySelector('.robot-arm-right')
  const ang = (node) => {
    const t = getComputedStyle(node).transform
    if (!t || t === 'none') return 0
    const m = t.match(/matrix\(([^)]+)\)/)
    if (!m) return 0
    const [a, b] = m[1].split(',').map(Number)
    return Math.round(Math.atan2(b, a) * (180 / Math.PI) * 10) / 10
  }
  const t0 = performance.now()
  const samples = []
  const windows = [[11400, 14600], [21600, 24200]]
  await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - t0
      if (t > windows[1][1] + 11400 - 11400 && t > 24200) return resolve()
      const inWindow = windows.some(([a, b]) => t >= a && t <= b)
      if (inWindow) {
        // re-query arms each sample: they may be re-parented (recreated)
        const aL = robot.querySelector('.robot-arm-left')
        const aR = robot.querySelector('.robot-arm-right')
        samples.push({
          t: Math.round(t),
          cls: robot.getAttribute('class'),
          L: ang(aL),
          R: ang(aR),
          inlL: aL.style.transform ? 1 : 0,
        })
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
  return samples
})
// Report discontinuities: |delta| > 30deg between consecutive samples
let prev = null
for (const s of data) {
  if (prev && s.t - prev.t < 120) {
    const dL = Math.abs(s.L - prev.L)
    const dR = Math.abs(s.R - prev.R)
    if (dL > 30 || dR > 30) {
      console.log(`JUMP @${s.t}ms  L:${prev.L}->${s.L}  R:${prev.R}->${s.R}  cls="${s.cls}" prevCls="${prev.cls}"`)
    }
  }
  prev = s
}
console.log('total samples:', data.length)
// Also print a compact timeline every ~200ms
for (let i = 0; i < data.length; i += 5) {
  const s = data[i]
  console.log(`${s.t}  L=${s.L}  R=${s.R}  inl=${s.inlL}  ${s.cls.replace('robot', '').trim()}`)
}
await browser.close()
