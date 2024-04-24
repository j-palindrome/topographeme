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

  return (
    <div>
      <Container title="speed">
        <input
          type="range"
          max={1}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ speed: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="circleSize">
        <input
          type="range"
          max={1}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ circleSize: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="strength">
        <input
          type="range"
          max={1}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ strength: Number(ev.target.value) })
          }}
        ></input>
      </Container>
      <Container title="strength">
        <input
          max={1}
          step={0.01}
          className="w-full max-w-[300px]"
          onChange={(ev) => {
            update({ text: ev.target.value })
          }}
        ></input>
      </Container>
    </div>
  )
}
