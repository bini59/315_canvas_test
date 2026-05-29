import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ClothCanvas,
  type ClothCanvasHandle,
  BEER_FLIGHT_TIME,
} from './ClothCanvas'
import './App.css'

const BASE = import.meta.env.BASE_URL
const BEER_SRC = `${BASE}beer-6pack.png`
const IMAGE_COUNT = 20

// Just-frame timing window: a touch within ±this of impact counts as a hit.
const HIT_WINDOW_MS = 42
const IMPACT_DELAY_MS = BEER_FLIGHT_TIME * 1000
// How long the center touch button stays armed after a throw.
const ARMED_MS = IMPACT_DELAY_MS + 240
const IMAGES = Array.from(
  { length: IMAGE_COUNT },
  (_, i) => `${BASE}image-cut/iseri-nina-${String(i + 1).padStart(2, '0')}.png`,
)

function pickRandom(exclude: string): string {
  if (IMAGES.length <= 1) return IMAGES[0]
  let i = Math.floor(Math.random() * IMAGES.length)
  if (IMAGES[i] === exclude) i = (i + 1) % IMAGES.length
  return IMAGES[i]
}

function App() {
  const [imageSrc, setImageSrc] = useState<string>(
    () => IMAGES[Math.floor(Math.random() * IMAGES.length)],
  )
  const [hinted, setHinted] = useState(false)
  const [armed, setArmed] = useState(false)
  const [niceKey, setNiceKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const canvasRef = useRef<ClothCanvasHandle | null>(null)
  const impactsRef = useRef<number[]>([])
  const armTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      if (armTimerRef.current) clearTimeout(armTimerRef.current)
    }
  }, [])

  const handleLoaded = useCallback(() => {
    setHinted(false)
  }, [])

  const shuffle = useCallback(() => {
    setImageSrc((cur) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      return pickRandom(cur)
    })
    setHinted(false)
  }, [])

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const throwBeer = useCallback(() => {
    canvasRef.current?.throwBeer()
    const now = performance.now()
    impactsRef.current = [
      ...impactsRef.current.filter((t) => now - t < 1500),
      now + IMPACT_DELAY_MS,
    ]
    setArmed(true)
    if (armTimerRef.current) clearTimeout(armTimerRef.current)
    armTimerRef.current = window.setTimeout(() => setArmed(false), ARMED_MS)
  }, [])

  const onTimingTouch = useCallback(() => {
    const now = performance.now()
    const hit = impactsRef.current.some(
      (im) => Math.abs(now - im) <= HIT_WINDOW_MS,
    )
    if (hit) setNiceKey((k) => k + 1)
  }, [])

  const handleFile = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setImageSrc(url)
    setHinted(false)
  }, [])

  return (
    <div className="app">
      <ClothCanvas
        ref={canvasRef}
        key={imageSrc}
        imageSrc={imageSrc}
        beerSrc={BEER_SRC}
        onLoaded={handleLoaded}
      />
      <div className="app__controls app__controls--left">
        <button type="button" className="app__btn" onClick={throwBeer}>
          맥주 투척
        </button>
      </div>
      {armed && (
        <button
          type="button"
          className="app__touch"
          onPointerDown={onTimingTouch}
          aria-label="타이밍 터치"
        >
          터치
        </button>
      )}
      {niceKey > 0 && (
        <div key={niceKey} className="app__nice" aria-live="polite">
          ナイスビール
        </div>
      )}
      <div className="app__controls">
        <button type="button" className="app__btn" onClick={openPicker}>
          Upload
        </button>
        <button type="button" className="app__btn" onClick={shuffle}>
          Shuffle
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="app__file"
        onChange={handleFile}
      />
      <div
        className={'app__hint' + (hinted ? ' app__hint--hidden' : '')}
        onAnimationEnd={() => setHinted(true)}
      >
        이미지를 터치해보세요
      </div>
    </div>
  )
}

export default App
