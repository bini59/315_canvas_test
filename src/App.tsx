import { useCallback, useMemo, useState } from 'react'
import { ClothCanvas } from './ClothCanvas'
import './App.css'

const BASE = import.meta.env.BASE_URL
const IMAGES = [
  `${BASE}image/iseri-nina-01.jpg`,
  `${BASE}image/iseri-nina-02.jpg`,
  `${BASE}image/iseri-nina-03.png`,
]

function pickRandom(excludeIndex: number): number {
  if (IMAGES.length <= 1) return 0
  let i = Math.floor(Math.random() * IMAGES.length)
  if (i === excludeIndex) i = (i + 1) % IMAGES.length
  return i
}

function App() {
  const [index, setIndex] = useState<number>(() =>
    Math.floor(Math.random() * IMAGES.length),
  )
  const [hinted, setHinted] = useState(false)
  const imageSrc = useMemo(() => IMAGES[index], [index])

  const handleLoaded = useCallback(() => {
    setHinted(false)
  }, [])

  const shuffle = useCallback(() => {
    setIndex((cur) => pickRandom(cur))
    setHinted(false)
  }, [])

  return (
    <div className="app">
      <ClothCanvas
        key={imageSrc}
        imageSrc={imageSrc}
        onLoaded={handleLoaded}
      />
      <button type="button" className="app__shuffle" onClick={shuffle}>
        Shuffle
      </button>
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
