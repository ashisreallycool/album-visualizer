// Smoke test: unboxes a demo album end to end through the guide buttons and screenshots each step.
// Usage: npm run dev, then `npx playwright install chromium` once and `node scripts/walk.mjs`.
// Env: PERSONA=raver|diarist|head|girlie|wall|nocturne WIDTH=375 HEIGHT=812 SCHEME=light FULL=0 OUT=dir
// Walks the unboxing flow in demo mode and captures screenshots + console errors.
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = process.env.OUT ?? 'e2e-shots'
const URL = process.env.URL ?? 'http://127.0.0.1:5173/'
const PERSONA = process.env.PERSONA ?? ''
const WIDTH = Number(process.env.WIDTH ?? 1440)
const HEIGHT = Number(process.env.HEIGHT ?? 900)
const SCHEME = process.env.SCHEME ?? 'dark'
const FULL = process.env.FULL !== '0'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
})
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, colorScheme: SCHEME, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

const tag = `${PERSONA || 'rand'}-${WIDTH}-${SCHEME}`
const SETTLE = Number(process.env.SETTLE ?? 2600)
const shot = async (name) => {
  await page.waitForTimeout(SETTLE)
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png` })
  console.log('shot', name)
}

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await shot('01-landing')

if (PERSONA) {
  // Version buttons are in order of THEME_LIST; persona ids map by index.
  const names = { raver: 'Acid Y2K', diarist: 'Scrapbook', head: 'Newsprint', girlie: 'Coquette', wall: 'Concrete', nocturne: 'Velvet' }
  await page.getByRole('button', { name: new RegExp(names[PERSONA]) }).click()
} else {
  await page.getByRole('button', { name: /Try the demo/ }).click()
}
await page.waitForTimeout(600)
await shot('02-loading')
try {
  await page.getByRole('application').waitFor({ timeout: 90000 })
} catch (err) {
  await page.screenshot({ path: `${OUT}/${tag}-FAIL.png` })
  console.log('STAGE DID NOT APPEAR')
  console.log('body text:', (await page.locator('body').innerText()).slice(0, 600))
  for (const e of errors) console.log('  ', e.slice(0, 400))
  await browser.close()
  process.exit(1)
}
await page.waitForTimeout(2500)
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let n = 0
      const start = performance.now()
      const tick = () => {
        n++
        if (performance.now() - start < 2000) requestAnimationFrame(tick)
        else resolve(n / 2)
      }
      requestAnimationFrame(tick)
    }),
)
console.log('headless fps ~', fps)
await shot('03-stage-wrapped')

if (FULL) {
  const click = async (label) => {
    const btn = page.getByRole('button', { name: label, exact: false }).first()
    await btn.click()
  }
  await click('Peel it')
  await shot('04-peeled')
  await click('Tear it open')
  await page.waitForTimeout(1200)
  await shot('05-torn')
  await click('Open the lid')
  await shot('06-lid-open')
  await click('Lift it out')
  await page.waitForTimeout(800)
  await shot('07-book-out')
  await click('Next page')
  await click('Next page')
  await shot('08-book-pages')
  for (let i = 0; i < 5; i++) await click('Pull a card')
  await shot('09-cards')
  await click('Slide it out')
  await shot('10-disc')
  const addInBtn = page.getByRole('button', { name: /Press play|Take a photo|Flip the tag/ }).first()
  await addInBtn.click()
  await shot('11-addin')
  // Close the inspect panel if the keychain opened it
  const close = page.getByRole('button', { name: 'Close panel' })
  if (await close.count()) await close.click()
  await click('Stick one on the cover')
  await shot('12-sticker')
  await page.getByRole('button', { name: /^Stats$/ }).click()
  await shot('13-stats')
  await page.getByRole('button', { name: 'Close stats' }).click()
  await page.getByRole('button', { name: /^Share$/ }).first().click()
  await shot('14-share')
  await page.getByRole('button', { name: 'Close share' }).click()
  await page.getByRole('button', { name: /Inclusions/ }).click()
  await page.getByRole('button', { name: /Read the Cover/ }).click()
  await shot('15-inspect-cover')
  await page.getByRole('button', { name: 'Close panel' }).click()
  // Overview
  await page.getByRole('button', { name: /Inclusions/ }).click().catch(() => {})
  await page.getByRole('button', { name: /^Overview$/ }).click().catch(() => {})
  await shot('16-overview')
}

fs.writeFileSync(`${OUT}/${tag}-console.txt`, errors.join('\n'))
console.log('console issues:', errors.length)
for (const e of errors.slice(0, 20)) console.log('  ', e.slice(0, 300))
await browser.close()
