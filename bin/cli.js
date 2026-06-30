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

function renderFish(t, gridW, gridH, cfg) {
  const { ramp, size, RX, RY, RZ, facing, showDetails,
    yawSpeed, pitchSpeed, pitchAmplitude, light } = cfg

  const buf = new Array(gridW * gridH).fill(' ')
  const zbuf = new Float32Array(gridW * gridH).fill(-Infinity)

  const lLen = Math.hypot(light.x, light.y, light.z) || 1
  // Terminal cells are roughly twice as tall as wide, so the vertical base
  // scale is squeezed relative to the browser version to keep the fish round.
  const baseScaleX = gridW / 7.4
  const baseScaleY = gridH / 8.0

  const ay = t * yawSpeed
  const ax = Math.sin(t * pitchSpeed) * pitchAmplitude
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

// Non-interactive (piped) output: print a single frame and exit.
if (!out.isTTY) {
  const { gridW, gridH } = dims()
  process.stdout.write(renderFish(0, gridW, Math.min(gridH, 24), CFG) + '\n')
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

const start = Date.now()
const SPEED = 1
const FRAME_MS = 33 // ~30fps

timer = setInterval(() => {
  if (!running) return
  const { gridW, gridH } = dims()
  const elapsed = (Date.now() - start) * SPEED
  const frame = renderFish(elapsed, gridW, gridH, CFG)
  out.write(CURSOR_HOME + frame)
}, FRAME_MS)
