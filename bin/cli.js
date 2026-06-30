#!/usr/bin/env node
// siikafish — a rotating 3D ASCII fish that swims in your terminal.
//
// The renderFish() core is ported verbatim (logic-wise) from the browser
// React component in the sikafish project: a parametric ellipsoid body with
// tail/fins, per-pixel Lambert lighting, and a z-buffer, rasterised into a
// character grid via a brightness ramp. Here the browser's sizing + rAF loop
// is replaced by terminal dimensions + a setInterval frame loop writing raw
// ANSI escapes into the alternate screen buffer.

const RAMP = ' .,-~:;=!*#$@'

const CFG = {
  ramp: RAMP,
  size: 1,
  RX: 2.0,
  RY: 0.75,
  RZ: 0.65,
  facing: 1,
  showDetails: true,
  yawSpeed: 0.0028,
  pitchSpeed: 0.0017,
  pitchAmplitude: 0.7,
  light: { x: -0.4, y: 0.55, z: 0.74 },
}

// `pose`, when given, supplies the yaw (ay) and pitch (ax) directly instead of
// deriving them from the swim clock — the decide mode drives these from a
// physics integrator so the fish can spin down to a chosen heading.
function renderFish(t, gridW, gridH, cfg, pose) {
  const { ramp, size, RX, RY, RZ, facing, showDetails,
    yawSpeed, pitchSpeed, pitchAmplitude, light } = cfg

  const buf = new Array(gridW * gridH).fill(' ')
  const zbuf = new Float32Array(gridW * gridH).fill(-Infinity)

  const lLen = Math.hypot(light.x, light.y, light.z) || 1
  // Terminal cells are roughly twice as tall as wide, so the vertical base
  // scale is squeezed relative to the browser version to keep the fish round.
  const baseScaleX = gridW / 7.4
  const baseScaleY = gridH / 8.0

  const ay = pose ? pose.ay : t * yawSpeed
  const ax = pose ? pose.ax : Math.sin(t * pitchSpeed) * pitchAmplitude
  const cosY = Math.cos(ay)
  const sinY = Math.sin(ay)
  const cosX = Math.cos(ax)
  const sinX = Math.sin(ax)

  const localScaleX = baseScaleX * size
  const localScaleY = baseScaleY * size
  const cx = gridW / 2
  const cy = gridH / 2
  const rampLen = ramp.length || 1

  function plot(x, y, z, nx, ny, nz, boost) {
    const fx = x * facing
    const fnx = nx * facing
    const xa = fx * cosY + z * sinY
    const za0 = -fx * sinY + z * cosY
    const ya = y * cosX - za0 * sinX
    const zb = y * sinX + za0 * cosX

    const nxa = fnx * cosY + nz * sinY
    const nza0 = -fnx * sinY + nz * cosY
    const nya = ny * cosX - nza0 * sinX
    const nzb = ny * sinX + nza0 * cosX

    const sx = Math.round(cx + xa * localScaleX)
    const sy = Math.round(cy - ya * localScaleY)
    if (sx < 0 || sx >= gridW || sy < 0 || sy >= gridH) return
    const idx = sy * gridW + sx
    if (zb <= zbuf[idx]) return
    zbuf[idx] = zb

    const nLen = Math.hypot(nxa, nya, nzb) || 1
    const dot = (nxa * light.x + nya * light.y + nzb * light.z) / (nLen * lLen)
    let lit = 0.3 + Math.max(0, dot) * 0.85 + boost
    if (lit > 1) lit = 1
    if (lit < 0) lit = 0
    const ri = Math.min(rampLen - 1, Math.floor(lit * (rampLen - 1)))
    buf[idx] = ramp[ri]
  }

  const stepU = size > 0.6 ? 0.07 : size > 0.4 ? 0.10 : 0.13
  const stepV = size > 0.6 ? 0.045 : size > 0.4 ? 0.07 : 0.10

  // Body.
  for (let u = 0; u < Math.PI * 2; u += stepU) {
    const cu = Math.cos(u)
    const su = Math.sin(u)
    for (let v = 0.001; v < Math.PI; v += stepV) {
      const cv = Math.cos(v)
      const sv = Math.sin(v)
      const x = RX * cu * sv
      const y = RY * cv
      const z = RZ * su * sv
      const nx = x / (RX * RX)
      const ny = y / (RY * RY)
      const nz = z / (RZ * RZ)
      plot(x, y, z, nx, ny, nz, 0)
    }
  }

  // Tail.
  const tailStep = size > 0.5 ? 0.05 : 0.08
  for (let s = 0; s <= 1; s += tailStep) {
    const tx = -RX - s * 1.45
    const halfH = 0.18 + s * 0.78
    for (let h = -halfH; h <= halfH; h += 0.06) {
      plot(tx, h, 0.02, -0.65, 0, 0.76, 0.05)
      plot(tx, h, -0.02, -0.65, 0, -0.76, 0.05)
    }
  }

  // Top fin.
  for (let s = 0; s <= 1; s += 0.05) {
    const fx = -0.7 + s * 1.4
    const lift = Math.sin(Math.PI * s) * 0.6
    const fy = RY + lift
    plot(fx, fy, 0.0, 0, 1, 0.1, 0.05)
  }
  // Bottom fin.
  for (let s = 0; s <= 1; s += 0.07) {
    const fx = -0.2 + s * 0.9
    const drop = Math.sin(Math.PI * s) * 0.32
    const fy = -RY - drop
    plot(fx, fy, 0.0, 0, -1, 0.1, 0.05)
  }

  if (showDetails && size > 0.35) {
    plot(1.55, 0.18, 0.45, 0, 0, 1, 1.5)
    plot(1.6, 0.18, 0.42, 0, 0, 1, 1.5)
    plot(1.85, -0.08, 0.32, 1, 0, 0.4, 0.6)
    plot(1.85, -0.18, 0.30, 1, 0, 0.4, 0.6)
    for (let g = -0.45; g <= 0.45; g += 0.08) {
      plot(1.05, g * 0.7, 0.55 - Math.abs(g) * 0.15, -0.5, 0, 0.86, 0.1)
    }
  }

  let out = ''
  for (let row = 0; row < gridH; row++) {
    if (row > 0) out += '\n'
    for (let col = 0; col < gridW; col++) {
      out += buf[row * gridW + col]
    }
  }
  return out
}

// --- YES / NO banner -------------------------------------------------------

// Chunky 6-row block glyphs (solid full-block strokes). Only Y E S N O needed.
const GLYPHS = {
  Y: ['██    ██', ' ██  ██ ', '  ████  ', '   ██   ', '   ██   ', '   ██   '],
  E: ['██████', '██    ', '█████ ', '██    ', '██    ', '██████'],
  S: ['██████', '██    ', '██████', '    ██', '    ██', '██████'],
  N: ['██   ██', '███  ██', '██ █ ██', '██  ███', '██   ██', '██   ██'],
  O: [' █████ ', '██   ██', '██   ██', '██   ██', '██   ██', ' █████ '],
}

// Render a word into block rows, glyphs separated by a blank column.
function bannerLines(word) {
  const h = GLYPHS[word[0]].length
  const rows = new Array(h).fill('')
  for (let i = 0; i < word.length; i++) {
    const g = GLYPHS[word[i]]
    for (let r = 0; r < h; r++) rows[r] += (i ? ' ' : '') + g[r]
  }
  return rows
}

// --- Confetti --------------------------------------------------------------

const CONFETTI_CHARS = ['*', '+', 'o', '.', '°', '•']
// bright red/green/yellow/blue/magenta/cyan foregrounds
const CONFETTI_COLORS = ['\x1b[91m', '\x1b[92m', '\x1b[93m', '\x1b[94m', '\x1b[95m', '\x1b[96m']

// Emit `count` confetti particles from behind/under the fish, fired upward.
function spawnConfetti(particles, gridW, gridH, count) {
  const cx = gridW / 2
  const cy = gridH / 2
  for (let i = 0; i < count && particles.length < 260; i++) {
    particles.push({
      x: cx + (Math.random() * 2 - 1) * gridW * 0.16,
      y: cy + Math.random() * 2,
      vx: (Math.random() * 2 - 1) * 0.8,
      vy: -(0.9 + Math.random() * 1.3), // negative = up; gravity pulls it back
      ch: CONFETTI_CHARS[(Math.random() * CONFETTI_CHARS.length) | 0],
      col: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
    })
  }
}

// Advance every particle under gravity, draw it, and drop the ones that exit.
function stepConfetti(particles, gridW, gridH) {
  const GRAV = 0.05
  let buf = ''
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.vy += GRAV
    p.x += p.vx
    p.y += p.vy
    if (p.y >= gridH - 1 || p.x < 0 || p.x >= gridW) {
      particles.splice(i, 1)
      continue
    }
    const row = Math.round(p.y) + 1
    const col = Math.round(p.x) + 1
    if (row >= 1 && row <= gridH && col >= 1 && col <= gridW) {
      buf += `\x1b[${row};${col}H${p.col}${p.ch}\x1b[0m`
    }
  }
  if (buf) out.write(buf)
}

const YES_LINES = bannerLines('YES')
const NO_LINES = bannerLines('NO')

// --- Winner art (duel mode) ------------------------------------------------
//
// Two styles, picked by how long the text is so the result always reads well:
//  • a full 5-row block font for short words (the YES/NO look, for any text);
//  • a word-wrapped bordered box for longer phrases.
// The style is chosen from *both* options so left and right look the same, and
// a fill/border variant is rolled once per run for a little variety.

// 5-row block font. Every glyph's rows are equal width; '?' is the fallback.
const FONT = {
  A: [' ██ ', '█  █', '████', '█  █', '█  █'],
  B: ['███ ', '█  █', '███ ', '█  █', '███ '],
  C: [' ███', '█   ', '█   ', '█   ', ' ███'],
  D: ['███ ', '█  █', '█  █', '█  █', '███ '],
  E: ['████', '█   ', '███ ', '█   ', '████'],
  F: ['████', '█   ', '███ ', '█   ', '█   '],
  G: [' ███', '█   ', '█ ██', '█  █', ' ███'],
  H: ['█  █', '█  █', '████', '█  █', '█  █'],
  I: ['███', ' █ ', ' █ ', ' █ ', '███'],
  J: ['  ██', '   █', '   █', '█  █', ' ██ '],
  K: ['█  █', '█ █ ', '██  ', '█ █ ', '█  █'],
  L: ['█   ', '█   ', '█   ', '█   ', '████'],
  M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
  N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
  O: [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
  P: ['███ ', '█  █', '███ ', '█   ', '█   '],
  Q: [' ██ ', '█  █', '█  █', '█ ██', ' ███'],
  R: ['███ ', '█  █', '███ ', '█ █ ', '█  █'],
  S: [' ███', '█   ', ' ██ ', '   █', '███ '],
  T: ['███', ' █ ', ' █ ', ' █ ', ' █ '],
  U: ['█  █', '█  █', '█  █', '█  █', ' ██ '],
  V: ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
  W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
  X: ['█   █', ' █ █ ', '  █  ', ' █ █ ', '█   █'],
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  Z: ['████', '   █', '  █ ', ' █  ', '████'],
  0: [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
  1: [' █ ', '██ ', ' █ ', ' █ ', '███'],
  2: ['███ ', '   █', ' ██ ', '█   ', '████'],
  3: ['███ ', '   █', ' ██ ', '   █', '███ '],
  4: ['█  █', '█  █', '████', '   █', '   █'],
  5: ['████', '█   ', '███ ', '   █', '███ '],
  6: [' ██ ', '█   ', '███ ', '█  █', ' ██ '],
  7: ['████', '   █', '  █ ', ' █  ', ' █  '],
  8: [' ██ ', '█  █', ' ██ ', '█  █', ' ██ '],
  9: [' ██ ', '█  █', ' ███', '   █', ' ██ '],
  ' ': ['  ', '  ', '  ', '  ', '  '],
  '?': ['███ ', '   █', ' ██ ', '    ', ' █  '],
  '!': ['█', '█', '█', ' ', '█'],
  '.': [' ', ' ', ' ', ' ', '█'],
  ',': [' ', ' ', ' ', '█', '█'],
  "'": ['█', '█', ' ', ' ', ' '],
  '-': ['   ', '   ', '███', '   ', '   '],
  '&': [' ██ ', '█  █', ' ██ ', '█ █ ', ' ██ '],
}

function glyphFor(ch) {
  return FONT[ch] || FONT[ch.toUpperCase()] || FONT['?']
}

// Width the text would occupy in the block font (glyphs + 1-col gaps).
function blockTextWidth(text) {
  const t = text.toUpperCase()
  let w = 0
  for (let i = 0; i < t.length; i++) w += (i ? 1 : 0) + glyphFor(t[i])[0].length
  return w
}

// Render text into 5 block-font rows, optionally with an alternate fill char.
function blockLines(text, fill) {
  const t = text.toUpperCase()
  const rows = ['', '', '', '', '']
  for (let i = 0; i < t.length; i++) {
    const g = glyphFor(t[i])
    for (let r = 0; r < 5; r++) rows[r] += (i ? ' ' : '') + g[r]
  }
  if (fill && fill !== '█') for (let r = 0; r < 5; r++) rows[r] = rows[r].split('█').join(fill)
  return rows
}

// Greedy word-wrap, hard-breaking any single word longer than `width`.
function wrapText(text, width) {
  const lines = []
  let cur = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word
    while (w.length > width) { // break a too-long word across lines
      if (cur) { lines.push(cur); cur = '' }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

const ART_BORDERS = [
  { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
]
// Per-run variation, rolled once and independent of which side wins.
const ART_FILL = Math.random() < 0.5 ? '█' : '▓'
const ART_BORDER = ART_BORDERS[(Math.random() * ART_BORDERS.length) | 0]

// Render text inside a bordered, word-wrapped box.
function boxLines(text, border, maxInner) {
  const inner = wrapText(text, Math.max(4, maxInner))
  const w = Math.max(...inner.map((l) => l.length))
  const horiz = border.h.repeat(w + 2)
  const rows = [border.tl + horiz + border.tr]
  for (const l of inner) rows.push(border.v + ' ' + l.padEnd(w) + ' ' + border.v)
  rows.push(border.bl + horiz + border.br)
  return rows
}

// Block art when both options fit the screen as block text, else a box. Keyed
// on both options so the style is identical no matter which one wins.
function winnerArt(text, gridW) {
  const cap = gridW - 4
  if (blockTextWidth(options[0]) <= cap && blockTextWidth(options[1]) <= cap) {
    return blockLines(text, ART_FILL)
  }
  return boxLines(text, ART_BORDER, gridW - 6)
}

// --- Terminal driver -------------------------------------------------------

const ALT_SCREEN_ON = '\x1b[?1049h'
const ALT_SCREEN_OFF = '\x1b[?1049l'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'
const WRAP_OFF = '\x1b[?7l'
const WRAP_ON = '\x1b[?7h'
const CURSOR_HOME = '\x1b[H'
const CLEAR = '\x1b[2J'

const out = process.stdout

function dims() {
  const cols = out.columns || 80
  const rows = out.rows || 24
  // Leave the very last cell unused so writing the final glyph never nudges
  // the terminal into scrolling, even with wrap disabled.
  return { gridW: Math.max(20, cols), gridH: Math.max(8, rows) }
}

// --- Argument parsing ------------------------------------------------------

const argv = process.argv.slice(2)
const DECIDE_CMDS = new Set(['decide', 'flip', 'coin', 'yesno', 'ask', '?'])
const SWIM_CMDS = new Set(['swim', 'swimming'])
const cmd = argv[0] && argv[0].toLowerCase()

if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  process.stdout.write(
    'siikafish — let a spinning fish decide for you.\n\n' +
    'Usage:\n' +
    '  siikafish [question...]   spin the fish like a coin; it points to YES or NO\n' +
    '  siikafish LEFT RIGHT      spin to pick one of two options (left vs right)\n' +
    '  siikafish swim            just watch the fish swim forever\n\n' +
    'Examples:\n' +
    '  siikafish\n' +
    '  siikafish "ship on friday?"\n' +
    '  siikafish apple banana\n\n' +
    'Keys: q or Ctrl-C to quit.\n')
  process.exit(0)
}

// Deciding is the default; `swim` is the opt-in screensaver. Args after an
// optional decide verb form the decision: exactly two of them (e.g.
// `siikafish apple banana`) is a left-vs-right duel; anything else is taken as
// an optional yes/no question.
const swimMode = SWIM_CMDS.has(cmd)
const decideMode = !swimMode
const decideArgs = DECIDE_CMDS.has(cmd) ? argv.slice(1) : argv
const duelMode = decideMode && decideArgs.length === 2
const options = duelMode ? decideArgs : null
const question = duelMode ? '' : decideArgs.join(' ').trim()

// Non-interactive (piped) output: print a single frame, or a single verdict.
if (!out.isTTY) {
  if (duelMode) {
    process.stdout.write((Math.random() < 0.5 ? options[0] : options[1]) + '\n')
  } else if (decideMode) {
    const yes = Math.random() < 0.5
    if (question) process.stdout.write(question + '\n')
    process.stdout.write((yes ? 'YES' : 'NO') + '\n')
  } else {
    const { gridW, gridH } = dims()
    process.stdout.write(renderFish(0, gridW, Math.min(gridH, 24), CFG) + '\n')
  }
  process.exit(0)
}

let running = true
let timer = null

function cleanup() {
  if (!running) return
  running = false
  if (timer) clearInterval(timer)
  out.write(SHOW_CURSOR + WRAP_ON + ALT_SCREEN_OFF)
}

function enter() {
  out.write(ALT_SCREEN_ON + HIDE_CURSOR + WRAP_OFF + CLEAR)
}

process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(0) })
process.on('SIGTERM', () => { cleanup(); process.exit(0) })
process.on('SIGHUP', () => { cleanup(); process.exit(0) })

// Let q / Ctrl-C quit cleanly.
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', (d) => {
    const s = d.toString()
    if (s === 'q' || s === '\x03') { cleanup(); process.exit(0) }
  })
}

enter()

const FRAME_MS = 33 // ~30fps

// Print the spoken verdict to the real terminal after we leave the alt screen,
// so `siikafish decide` is also usable in a script: `[ "$(... )" = YES ]`.
let verdict = null
function speakVerdict() {
  if (verdict === null) return
  if (question) process.stdout.write(question + '\n')
  process.stdout.write(verdict + '\n')
}
process.on('exit', speakVerdict)

if (decideMode) runDecide()
else runSwim()

function runSwim() {
  const start = Date.now()
  timer = setInterval(() => {
    if (!running) return
    const { gridW, gridH } = dims()
    const frame = renderFish(Date.now() - start, gridW, gridH, CFG)
    out.write(CURSOR_HOME + frame)
  }, FRAME_MS)
}

// Spin the fish like a coin and let it settle pointing left (YES) or right (NO).
//
// The outcome is a fair coin chosen up front; the visible spin is a genuine
// damped-pendulum integration whose single stable rest angle is that outcome's
// heading. So it *looks* like momentum decided it, but every run is 50/50 and
// always settles cleanly on one side (never wedged broadside).
function runDecide() {
  // The outcome is a fair coin chosen up front; the physics just animates toward
  // it. `leftWins` ⇒ the head ends up pointing left (YES, or the first option).
  const leftWins = Math.random() < 0.5
  const target = leftWins ? Math.PI : 0 // π → head points left; 0 → head points right
  // A yes/no question celebrates only the YES (left) outcome; a two-option duel
  // celebrates whichever side wins.
  const celebrate = duelMode ? true : leftWins

  // Random kick: start a little off-heading with a random-signed spin. A heavy
  // fish — modest initial ω with light friction — gives a slower, statelier whirl
  // (~3 rev/s) that carries ~7 turns and decelerates gradually before resting.
  let theta = target + (Math.random() * 2 - 1) * 1.2
  let omega = (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.25)

  const PULL = 0.015   // restoring torque toward the resting heading
  const FRICTION = 0.982 // per-frame angular damping (light → long spin-down)
  // Climbing back over the unstable "top" to the other side needs |ω| ≥
  // √(4·PULL) ≈ 0.24, so once the fish is below this within the final basin the
  // outcome can no longer change. We reveal a bit under that, so by reveal time
  // the fish already looks all-but-settled while it finishes its last wobble.
  const REVEAL_OMEGA = 0.12
  let revealed = false
  let exiting = false
  const confetti = []
  let celebFrames = 0

  timer = setInterval(() => {
    if (!running) return

    omega += -PULL * Math.sin(theta - target)
    omega *= FRICTION
    theta += omega
    if (!revealed && Math.abs(omega) < REVEAL_OMEGA && Math.cos(theta - target) > 0.2) {
      revealed = true
    }

    // Tilt the nose with the spin; it flattens out on its own as ω → 0.
    const pitch = Math.max(-0.5, Math.min(0.5, omega * 1.3))

    const { gridW, gridH } = dims()
    const frame = renderFish(0, gridW, gridH, CFG, { ay: theta, ax: pitch })
    out.write(CURSOR_HOME + frame)

    // Confetti sits behind the text overlays so the verdict stays crisp.
    if (revealed && celebrate) {
      if (celebFrames === 0) spawnConfetti(confetti, gridW, gridH, 70) // opening blast
      else if (celebFrames < 45) spawnConfetti(confetti, gridW, gridH, 5) // sustain it
      celebFrames++
      stepConfetti(confetti, gridW, gridH)
    }

    // The duel options stay hidden during the spin; only the winner is revealed,
    // in big block/box art (neutral colour, so it reads on any terminal theme).
    if (duelMode) {
      if (revealed) {
        const winner = leftWins ? options[0] : options[1]
        drawArt(winnerArt(winner, gridW), gridW, gridH, leftWins ? 'left' : 'right', '\x1b[1m')
      }
    } else {
      if (question) {
        const col = Math.max(1, Math.floor((gridW - question.length) / 2) + 1)
        out.write(`\x1b[1;${col}H\x1b[2m${question}\x1b[0m`)
      }
      if (revealed) drawBanner(gridW, gridH, leftWins)
    }

    if (revealed && !exiting) {
      exiting = true
      verdict = duelMode ? (leftWins ? options[0] : options[1]) : (leftWins ? 'YES' : 'NO')
      setTimeout(() => { cleanup(); process.exit(0) }, celebrate ? 4500 : 3200)
    }
  }, FRAME_MS)
}

// Paint the colored YES/NO block banner on the side the fish points to.
function drawBanner(gridW, gridH, yes) {
  const lines = yes ? YES_LINES : NO_LINES
  const color = yes ? '\x1b[1;32m' : '\x1b[1;31m' // green / red
  drawArt(lines, gridW, gridH, yes ? 'left' : 'right', color)
}

// Place pre-rendered art rows above the fish: hugged to the chosen side when it
// fits a half-width, otherwise centred. `style` is the SGR prefix per row.
function drawArt(lines, gridW, gridH, side, style) {
  const w = Math.max(...lines.map((l) => l.length))
  const top = Math.max(1, Math.floor(gridH * 0.1))
  const pad = Math.floor(gridW * 0.1)
  let left
  if (w <= Math.floor(gridW / 2) - 2) {
    left = side === 'left' ? 1 + pad : Math.max(1, gridW - w - pad)
  } else {
    left = Math.max(1, Math.floor((gridW - w) / 2) + 1)
  }
  const rows = Math.min(lines.length, gridH - top + 1)
  for (let r = 0; r < rows; r++) {
    out.write(`\x1b[${top + r};${left}H${style}${lines[r]}\x1b[0m`)
  }
}
