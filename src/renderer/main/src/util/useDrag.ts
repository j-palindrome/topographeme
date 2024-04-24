import { useEffect, useReducer, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
export function useDrag(
  callback: (dragChange: { x: number; y: number }) => void,
  deps: any[] = [],
  threshold = 1
) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLDivElement | null>(null)
  const dragTicProgress = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!inputRef.current) return
    const mouseDownListener = () => {
      setDragging(true)
    }
    inputRef.current.addEventListener('mousedown', mouseDownListener)
    return () => {
      if (!inputRef.current) return
      inputRef.current.removeEventListener('mousedown', mouseDownListener)
    }
  }, [inputRef.current])

  useEffect(() => {
    const mouseUpListener = () => {
      setDragging(false)
    }
    const mouseMoveListener = (ev: MouseEvent) => {
      dragTicProgress.current.x += ev.movementX
      dragTicProgress.current.y += ev.movementY * -1

      if (
        Math.abs(dragTicProgress.current.x) > threshold ||
        Math.abs(dragTicProgress.current.y) > threshold
      ) {
        callback({ x: dragTicProgress.current.x, y: dragTicProgress.current.y })
        dragTicProgress.current = { x: 0, y: 0 }
      }
    }
    if (dragging) {
      window.addEventListener('mouseup', mouseUpListener)
      window.addEventListener('mousemove', mouseMoveListener)
      dragTicProgress.current = { x: 0, y: 0 }
      try {
        inputRef.current?.requestPointerLock()
      } catch (err) {}
    }
    return () => {
      window.removeEventListener('mouseup', mouseUpListener)
      window.removeEventListener('mousemove', mouseMoveListener)
      window.document.exitPointerLock()
    }
  }, [dragging, ...deps])

  return inputRef
}
