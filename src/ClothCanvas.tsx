import { useEffect, useRef } from 'react'

type Point = {
  x: number
  y: number
  px: number
  py: number
  pinned: boolean
  pinX: number
  pinY: number
}

type Constraint = {
  a: number
  b: number
  rest: number
}

type Cloth = {
  cols: number
  rows: number
  points: Point[]
  constraints: Constraint[]
  imgW: number
  imgH: number
  originX: number
  originY: number
}

const COLS = 16
const ROWS = 22
const GRAVITY = 520
const DAMPING = 0.985
const ITERATIONS = 6
const WIND_AMPLITUDE = 90
const IMPULSE_RADIUS_RATIO = 0.35
const IMPULSE_STRENGTH = 14

type Props = {
  imageSrc: string
  onLoaded?: () => void
}

function buildCloth(
  imgW: number,
  imgH: number,
  originX: number,
  originY: number,
): Cloth {
  const points: Point[] = []
  const dx = imgW / (COLS - 1)
  const dy = imgH / (ROWS - 1)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = originX + c * dx
      const y = originY + r * dy
      points.push({
        x,
        y,
        px: x,
        py: y,
        pinned: r === 0,
        pinX: x,
        pinY: y,
      })
    }
  }
  const constraints: Constraint[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      if (c < COLS - 1) {
        const j = i + 1
        constraints.push({ a: i, b: j, rest: dx })
      }
      if (r < ROWS - 1) {
        const j = i + COLS
        constraints.push({ a: i, b: j, rest: dy })
      }
    }
  }
  return { cols: COLS, rows: ROWS, points, constraints, imgW, imgH, originX, originY }
}

function step(cloth: Cloth, dt: number, time: number) {
  const wind =
    Math.sin(time * 0.0011) * WIND_AMPLITUDE +
    Math.sin(time * 0.0027) * WIND_AMPLITUDE * 0.4
  for (const p of cloth.points) {
    if (p.pinned) {
      p.x = p.pinX
      p.y = p.pinY
      p.px = p.pinX
      p.py = p.pinY
      continue
    }
    const vx = (p.x - p.px) * DAMPING
    const vy = (p.y - p.py) * DAMPING
    p.px = p.x
    p.py = p.y
    p.x += vx + wind * dt * dt
    p.y += vy + GRAVITY * dt * dt
  }
  for (let k = 0; k < ITERATIONS; k++) {
    for (const c of cloth.constraints) {
      const pa = cloth.points[c.a]
      const pb = cloth.points[c.b]
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      const diff = (dist - c.rest) / dist
      const offX = dx * 0.5 * diff
      const offY = dy * 0.5 * diff
      if (!pa.pinned) {
        pa.x += offX
        pa.y += offY
      }
      if (!pb.pinned) {
        pb.x -= offX
        pb.y -= offY
      }
    }
    for (const p of cloth.points) {
      if (p.pinned) {
        p.x = p.pinX
        p.y = p.pinY
      }
    }
  }
}

function applyImpulse(cloth: Cloth, cx: number, cy: number) {
  const radius = Math.max(cloth.imgW, cloth.imgH) * IMPULSE_RADIUS_RATIO
  const r2 = radius * radius
  for (const p of cloth.points) {
    if (p.pinned) continue
    const dx = p.x - cx
    const dy = p.y - cy
    const d2 = dx * dx + dy * dy
    if (d2 > r2) continue
    const falloff = 1 - Math.sqrt(d2) / radius
    const dirX = dx / (Math.sqrt(d2) || 1)
    const dirY = dy / (Math.sqrt(d2) || 1)
    p.x += dirX * IMPULSE_STRENGTH * falloff
    p.y += dirY * IMPULSE_STRENGTH * falloff - IMPULSE_STRENGTH * 0.5 * falloff
  }
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  dx0: number, dy0: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(dx0, dy0)
  ctx.lineTo(dx1, dy1)
  ctx.lineTo(dx2, dy2)
  ctx.closePath()
  ctx.clip()

  const denom = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0)
  if (Math.abs(denom) < 1e-6) {
    ctx.restore()
    return
  }
  const a = ((dx1 - dx0) * (sy2 - sy0) - (dx2 - dx0) * (sy1 - sy0)) / denom
  const c = ((dx2 - dx0) * (sx1 - sx0) - (dx1 - dx0) * (sx2 - sx0)) / denom
  const e = dx0 - a * sx0 - c * sy0
  const b = ((dy1 - dy0) * (sy2 - sy0) - (dy2 - dy0) * (sy1 - sy0)) / denom
  const d = ((dy2 - dy0) * (sx1 - sx0) - (dy1 - dy0) * (sx2 - sx0)) / denom
  const f = dy0 - b * sx0 - d * sy0

  ctx.transform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

function render(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cloth: Cloth,
  dpr: number,
  cssW: number,
  cssH: number,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const dx = img.naturalWidth / (cloth.cols - 1)
  const dy = img.naturalHeight / (cloth.rows - 1)

  for (let r = 0; r < cloth.rows - 1; r++) {
    for (let c = 0; c < cloth.cols - 1; c++) {
      const i0 = r * cloth.cols + c
      const i1 = i0 + 1
      const i2 = i0 + cloth.cols
      const i3 = i2 + 1

      const p0 = cloth.points[i0]
      const p1 = cloth.points[i1]
      const p2 = cloth.points[i2]
      const p3 = cloth.points[i3]

      const sx0 = c * dx
      const sy0 = r * dy
      const sx1 = (c + 1) * dx
      const sy1 = r * dy
      const sx2 = c * dx
      const sy2 = (r + 1) * dy
      const sx3 = (c + 1) * dx
      const sy3 = (r + 1) * dy

      drawTriangle(
        ctx, img,
        sx0, sy0, sx1, sy1, sx2, sy2,
        p0.x, p0.y, p1.x, p1.y, p2.x, p2.y,
      )
      drawTriangle(
        ctx, img,
        sx1, sy1, sx3, sy3, sx2, sy2,
        p1.x, p1.y, p3.x, p3.y, p2.x, p2.y,
      )
    }
  }
}

export function ClothCanvas({ imageSrc, onLoaded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const clothRef = useRef<Cloth | null>(null)
  const rafRef = useRef<number | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false

    function fitCanvas() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      sizeRef.current = { w, h, dpr }
    }

    function placeImage() {
      const img = imgRef.current
      if (!img) return
      const { w, h } = sizeRef.current
      const maxW = w * 0.78
      const maxH = h * 0.7
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
      const imgW = img.naturalWidth * scale
      const imgH = img.naturalHeight * scale
      const originX = (w - imgW) / 2
      const originY = h * 0.08
      clothRef.current = buildCloth(imgW, imgH, originX, originY)
    }

    fitCanvas()

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      imgRef.current = img
      placeImage()
      onLoaded?.()
      lastTs = performance.now()
      loop(lastTs)
    }
    img.onerror = () => {
      console.error('Failed to load image:', imageSrc)
    }
    img.src = imageSrc

    let lastTs = performance.now()
    function loop(ts: number) {
      if (cancelled) return
      const cloth = clothRef.current
      const image = imgRef.current
      if (cloth && image && ctx) {
        let dt = (ts - lastTs) / 1000
        if (dt > 0.05) dt = 0.05
        lastTs = ts
        step(cloth, dt, ts)
        const { dpr, w, h } = sizeRef.current
        render(ctx, image, cloth, dpr, w, h)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    function handleResize() {
      fitCanvas()
      placeImage()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    function pointerXY(ev: PointerEvent): { x: number; y: number } | null {
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
    }

    function onPointerDown(ev: PointerEvent) {
      ev.preventDefault()
      const cloth = clothRef.current
      const pos = pointerXY(ev)
      if (!cloth || !pos) return
      applyImpulse(cloth, pos.x, pos.y)
    }

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false })

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      canvas.removeEventListener('pointerdown', onPointerDown)
    }
  }, [imageSrc, onLoaded])

  return <canvas ref={canvasRef} className="app__canvas" />
}
