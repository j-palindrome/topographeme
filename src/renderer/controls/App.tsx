import { useEffect, useState } from 'react'

const Container = ({ title, children }: React.PropsWithChildren & { title: string }) => {
  return (
    <div>
      <h2 className="font-sans text-white">{title}</h2>
      {children}
    </div>
  )
}

export default function App() {
  const update = (newState: Partial<AppState>) => {
    window.electron.ipcRenderer.send('set', newState)
  }

  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(0)
  const [circleSize, setCircleSize] = useState(0)
  const [strength, setStrength] = useState(0.1)
  const [lock, setLock] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [translate, setTranslate] = useState(0)
  const [pauseVideo, setPauseVideo] = useState(0)
  const updateAll = () => {
    update({
      speed: speed ** 2,
      circleSize: circleSize ** 3,
      strength: strength ** 5,
      rotate,
      translate: translate ** 2,
      pauseVideo: pauseVideo
    })
  }
  useEffect(() => {
    if (lock) return
    updateAll()
  }, [lock, speed, circleSize, strength, translate, rotate, pauseVideo])

  return (
    <div className="text-white font-mono">
      <button onClick={() => setLock(!lock)}>{lock ? 'unlock' : 'lock'}</button>
      <div>
        <button
          onClick={(ev) => {
            setPauseVideo(pauseVideo + 1)
          }}
        >
          pause
        </button>
      </div>
      <div>
        <button
          onClick={(ev) => {
            setPauseVideo(0)
          }}
        >
          reset
        </button>
      </div>
      <Container title="speed">
        <input
          type="range"
          value={speed}
          max={5}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            setSpeed(Number(ev.target.value))
          }}
        ></input>
      </Container>
      <Container title="circleSize">
        <input
          type="range"
          max={1}
          min={0.0001}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            setCircleSize(Number(ev.target.value))
          }}
        ></input>
      </Container>
      <Container title="strength">
        <input
          type="range"
          max={1}
          min={0.001}
          step={0.01}
          value={strength}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            setStrength(Number(ev.target.value))
          }}
        ></input>
      </Container>
      <Container title="translate">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            setTranslate(Number(ev.target.value))
          }}
        ></input>
      </Container>
      <Container title="rotate">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            setRotate(Number(ev.target.value))
          }}
        ></input>
      </Container>
      <Container title="text">
        <input
          value={text}
          className="w-full max-w-[300px] text-black"
          onChange={(ev) => {
            setText(ev.target.value)
          }}
        ></input>
        <button
          onClick={() => {
            update({
              text
            })
            updateAll()
          }}
        >
          set
        </button>
      </Container>
      <Container title="text opacity">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ textOpacity: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="lowpass">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ lowpass: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="particle opacity">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ opacity: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="angle">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ angle: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="volume">
        <input
          max={1}
          type="range"
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ volume: Number(ev.target.value) })
          }}
        ></input>
      </Container>

      <button
        onClick={() => {
          update({ setSample: 1 })
        }}
      >
        resample
      </button>
    </div>
  )
}
