export const eventsMap = {
  setParameter: (newValue: number) => {}
}

declare global {
  type AppState = {
    speed: number
    circleSize: number
    strength: number
    text: string
    textOpacity: number
    rotation: number
    lowpass: number
    setSample: number
    opacity: number
    angle: number
    volume: number
    translate: number
    rotate: number
    pauseVideo: number
  }
}
