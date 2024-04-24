import { useEffect, useRef, useState } from 'react'
import { scale as scaleFunction, useRefAsState } from '../../../../util/util'
import { setters, useAppStore } from '../store'
import { useDrag } from '../util/useDrag'
import _ from 'lodash'

export default function SliderRange({
  range: [min, max],
  onChange,
  lines
}: {
  range: [number, number]
  onChange: ([min, max]: [number, number]) => void
  lines?: number[]
}) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [clicking, setClicking] = useState(false)

  const left = Math.min(start, end)
  const width = Math.abs(start - end)
  const right = Math.max(start, end)

  const [clientLeft, setClientLeft] = useRefAsState(0)
  const [frameWidth, setFrameWidth] = useRefAsState(0)

  const lowValue = scaleFunction(left, 0, frameWidth, min, max)
  const highValue = scaleFunction(right, 0, frameWidth, min, max)

  useEffect(() => {
    onChange([lowValue, highValue])
  }, [start, end])

  const scale = useAppStore(state => state.midi.scale)

  const baseValue = useDrag(
    ({ x, y }) => {
      const FACTOR = 2
      const range = end - start
      const newStart = start + x * FACTOR
      setStart(newStart)
      setEnd(newStart + range + y * FACTOR)
    },
    [start, end]
  )

  return (
    <>
      <div className='flex font-mono h-12 w-full'>
        <div
          ref={node => {
            if (!node) return
            const rect = node.getBoundingClientRect()
            setClientLeft(rect.left)
            setFrameWidth(rect.width)
          }}
          className='w-full h-full relative rounded-lg border border-white'
          onMouseDown={ev => {
            setStart(ev.clientX - clientLeft)
            setEnd(ev.clientX - clientLeft)
            setClicking(true)
          }}
          onMouseUp={() => {
            setClicking(false)
          }}
          onMouseMove={ev => {
            if (!clicking) return
            setEnd(ev.clientX - clientLeft)
          }}>
          <div
            style={{ left, width }}
            className='h-full bg-white absolute top-0'
          />
          {lines
            ?.filter(line => line > lowValue)
            .map((line, i) => (
              <div
                key={i}
                className='h-full w-1 bg-red-800 absolute top-0'
                style={{
                  left: scaleFunction(line, lowValue, highValue, left, right)
                }}></div>
            ))}
        </div>
      </div>
      <div className='flex w-full h-10 space-x-2'>
        <div
          className='flex rounded-lg border border-white items-center px-1'
          ref={baseValue}>
          <div className='w-[4em] text-center'>{lowValue.toFixed(2)}</div>
          <div className='w-[4em] text-center'>
            {(highValue - lowValue).toFixed(2)}
          </div>
        </div>

        {scale.map((_number, i) => (
          <ScaleNumber i={i} key={i} />
        ))}
        <div className='grow'></div>
        <button onClick={() => setters.setMidi({ scale: scale.concat(1) })}>
          +
        </button>
        {scale.length > 1 && (
          <button
            onClick={() => setters.setMidi({ scale: scale.slice(0, -1) })}>
            -
          </button>
        )}
        <button
          onClick={() => setters.setMidi({ scale: _.reverse([...scale]) })}>
          I
        </button>
        <button
          onClick={() =>
            setters.setMidi({ scale: scale.slice(1).concat(scale[0]) })
          }>
          {'<'}
        </button>
        <button
          onClick={() =>
            setters.setMidi({
              scale: [scale[scale.length - 1]].concat(scale.slice(0, -1))
            })
          }>
          {'>'}
        </button>
      </div>
    </>
  )
}

function ScaleNumber({ i }: { i: number }) {
  const scale = useAppStore(state => state.midi.scale)
  const drag = useDrag(
    ({ y }) => {
      const newScale = [...scale]
      newScale[i] += y > 0 ? 1 : -1
      if (newScale[i] < 1) newScale[i] = 1
      setters.setMidi({ scale: newScale })
    },
    [scale[i]],
    25
  )
  return (
    <div ref={drag} className='p-2 rounded-lg border border-white'>
      {scale[i]}
    </div>
  )
}
