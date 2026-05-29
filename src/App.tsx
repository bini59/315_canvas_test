import { useCallback, useMemo, useState } from 'react'
import { ClothCanvas } from './ClothCanvas'
import './App.css'

const BASE = import.meta.env.BASE_URL
const IMAGE_FILES = [
  'iseri-nina-01.jpg',
  'iseri-nina-02.jpg',
  'iseri-nina-03.png',
  'iseri-nina-04.jpg',
  'iseri-nina-05.png',
  'iseri-nina-06.jpg',
  'iseri-nina-07.jpg',
  'iseri-nina-08.jpg',
  'iseri-nina-09.jpg',
  'iseri-nina-10.jpg',
  'iseri-nina-11.png',
  'iseri-nina-12.jpg',
  'iseri-nina-13.jpg',
  'iseri-nina-14.jpg',
  'iseri-nina-15.jpg',
  'iseri-nina-16.jpg',
  'iseri-nina-17.jpg',
  'iseri-nina-18.jpg',
  'iseri-nina-19.jpg',
  'iseri-nina-20.jpg',
]
const IMAGES = IMAGE_FILES.map((f) => `${BASE}image/${f}`)

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
