export const eventsMap = {
  setParameter: (newValue: number) => {}
}

declare global {
  type AppState = {
    speed: number
    circleSize: number
    strength: number
    text: string
  }
}
