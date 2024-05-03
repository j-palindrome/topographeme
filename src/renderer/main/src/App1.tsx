import type { NodeRepr_t } from '@elemaudio/core'
import { el } from '@elemaudio/core'
import { useAnimation } from '@util/animation'
import { useSlider } from '@util/dom'
import { mtof, rad, scale } from '@util/math'
import { PixelArray } from '@util/pixels'
import { generateContexts } from '@util/setups'
import _ from 'lodash'
import { useEffect, useRef, useState } from 'react'
import * as twgl from 'twgl.js'
import fragmentShader from './f.frag?raw'
import { keys } from './util/scaling'
import vertexShader from './v.vert?raw'

const Container = ({ title, children }: React.PropsWithChildren & { title: string }) => {
  return (
    <div>
      <h2 className="font-sans text-white">{title}</h2>
      {children}
    </div>
  )
}

export default function Scene() {
  const state = useRef<AppState>({
    speed: 1,
    circleSize: 0.5,
    strength: 1,
    text: '',
    textOpacity: 0,
    rotation: 1,
    lowpass: 1,
    setSample: 0,
    opacity: 0.2,
    angle: 0,
    volume: 1,
    translate: 0,
    rotate: 0
  })
  useEffect(() => {
    window.electron.ipcRenderer.on('set', (_event, newState: Partial<AppState>) => {
      state.current = { ...state.current, ...newState }
      if (typeof newState.textOpacity !== 'undefined') {
        textFrame.current.style.opacity = `${newState.textOpacity}`
      }
    })
    textFrame.current.style.opacity = `${state.current.textOpacity}`
  }, [])
  const [animating, setAnimating] = useState(false)
  const [sample, setSample] = useState(0)
  const frame = useRef<HTMLCanvasElement>(null!)
  const textFrame = useRef<HTMLCanvasElement>(null!)

  const setup1 = ({ gl }: { gl: WebGL2RenderingContext }) => {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    const numParticles = ((gl.canvas.width / 3) * gl.canvas.height) / 3
    const positions: number[] = []
    const velocities: number[] = []
    const speeds: number[] = []
    for (let i = 0; i < numParticles; i++) {
      positions.push(_.random(-1, 1, true), _.random(-1, 1, true))
      velocities.push(Math.sin(rad(i / numParticles)), Math.cos(rad(i / numParticles)))
      speeds.push(1.0)
    }

    const tfBufferInfo1 = twgl.createBufferInfoFromArrays(gl, {
      a_positionIn: {
        numComponents: 2,
        data: new Float32Array(positions)
      },
      a_positionOut: {
        numComponents: 2,
        data: new Float32Array(positions)
      },
      a_velocity: {
        numComponents: 2,
        data: new Float32Array(velocities)
      },
      a_velocityOut: {
        numComponents: 2,
        data: new Float32Array(velocities)
      },
      a_speedIn: { numComponents: 1, data: new Float32Array(speeds) },
      a_speedOut: { numComponents: 1, data: new Float32Array(speeds) },
      a_audioOut: { numComponents: 1, data: new Float32Array(speeds) }
    })

    const tfBufferInfo2 = twgl.createBufferInfoFromArrays(gl, {
      a_positionIn: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_positionOut.buffer
      },
      a_positionOut: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_positionIn.buffer
      },
      a_velocity: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_velocityOut.buffer
      },
      a_velocityOut: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_velocity.buffer
      },
      a_speedIn: {
        numComponents: 1,
        buffer: tfBufferInfo1.attribs!.a_speedOut.buffer
      },
      a_speedOut: {
        numComponents: 1,
        buffer: tfBufferInfo1.attribs!.a_speedIn.buffer
      },
      a_audioOut: {
        numComponents: 1,
        // we write to the same buffer as tfBufferInfo1 because we just want to read it
        buffer: tfBufferInfo1.attribs!.a_audioOut.buffer
      }
    })

    let setNdx = 0

    const soundReading = {
      speeds: new Float32Array(speeds.length),
      previousSpeeds: new Float32Array(speeds.length),
      pan: new Float32Array(speeds.length),
      previousPan: new Float32Array(speeds.length),
      headings: new Float32Array(velocities.length)
    }

    return {
      setNdx,
      tfBufferInfo1,
      tfBufferInfo2,
      soundReading
    }
  }

  const setup2 = ({
    gl,
    tfBufferInfo1,
    tfBufferInfo2
  }: {
    gl: WebGL2RenderingContext
    tfBufferInfo1: twgl.BufferInfo
    tfBufferInfo2: twgl.BufferInfo
  }) => {
    const feedbackProgramInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader], {
      transformFeedbackVaryings: ['a_positionOut', 'a_speedOut', 'a_audioOut', 'a_velocityOut']
    })

    const tfVAInfo1 = twgl.createVertexArrayInfo(gl, feedbackProgramInfo, tfBufferInfo1)
    const tfVAInfo2 = twgl.createVertexArrayInfo(gl, feedbackProgramInfo, tfBufferInfo2)

    const feedback1 = twgl.createTransformFeedback(gl, feedbackProgramInfo, tfBufferInfo1)
    const feedback2 = twgl.createTransformFeedback(gl, feedbackProgramInfo, tfBufferInfo2)

    const sets = [
      {
        feedback: feedback1,
        tfVAInfo: tfVAInfo1
      },
      {
        feedback: feedback2,
        tfVAInfo: tfVAInfo2
      }
    ]

    return { sets, feedbackProgramInfo }
  }

  const setup3 = ({ gl }: { gl: WebGL2RenderingContext }) => {
    let array = new PixelArray(
      new Uint8Array(gl.canvas.width * gl.canvas.height * 4),
      gl.canvas.width,
      gl.canvas.height
    )

    const tex = twgl.createTexture(gl, {
      src: array,
      width: gl.canvas.width,
      height: gl.canvas.height,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE
    })

    return { tex, array }
  }

  const [scene, setScene] = useState(0)

  let lastTime = 0
  const props = useAnimation(
    animating,
    async () => {
      const contexts = await generateContexts(frame.current, {})
      const { gl } = contexts

      const part1 = setup1({ gl })
      const part2 = setup2({
        gl,
        tfBufferInfo1: part1.tfBufferInfo1,
        tfBufferInfo2: part1.tfBufferInfo2
      })
      const part3 = setup3({ gl })

      const setupText = () => {
        const layer = textFrame.current
        layer.height = 1080
        layer.width = 1080
        const ctx = layer.getContext('2d')!
        ctx.textAlign = 'center'
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'transparent'
        return {
          ctx,
          textTexture: twgl.createTexture(gl, {
            width: layer.width,
            height: layer.height
          })
        }
      }
      return {
        ...contexts,
        ...part1,
        ...part2,
        ...part3,
        text: setupText(),
        sound: {
          sample: 0
        }
      }
    },
    (
      time,
      {
        gl,
        core,
        tfBufferInfo1,
        setNdx,
        soundReading: { speeds, previousSpeeds, pan, previousPan },
        array,
        tex,
        sets,
        feedbackProgramInfo,
        text,
        sound: { sample }
      }
    ) => {
      const visuals = () => {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        const { feedback, tfVAInfo } = sets[setNdx]
        props.current.setNdx = 1 - setNdx

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        // update
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        gl.useProgram(feedbackProgramInfo.program)
        twgl.setBuffersAndAttributes(gl, feedbackProgramInfo, tfVAInfo)
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback)
        gl.beginTransformFeedback(gl.POINTS)
        twgl.setUniforms(feedbackProgramInfo, {
          u_deltaTime: time - lastTime,
          u_time: time,
          u_sampler: tex,
          u_circleSize: state.current.circleSize,
          u_speed: state.current.speed,
          u_resolution: [gl.canvas.width, gl.canvas.height],
          u_strength: state.current.strength,
          u_textTexture: text.textTexture,
          opacity: state.current.opacity,
          angle: state.current.angle
        })
        twgl.drawBufferInfo(gl, tfVAInfo, gl.POINTS)
        gl.endTransformFeedback()
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)

        gl.readPixels(0, 0, gl.canvas.width, gl.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, array)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.canvas.width,
          gl.canvas.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          array
        )

        previousSpeeds.set(speeds)
        previousPan.set(pan)
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfBufferInfo1.attribs!.a_speedOut.buffer)
        gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, speeds)
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tfBufferInfo1.attribs!.a_audioOut.buffer)
        gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, pan)
      }
      visuals()
      const drawText = () => {
        const { ctx } = text
        const w = ctx.canvas.width
        const h = ctx.canvas.height
        ctx.resetTransform()
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx.font = `${20}px "Andale Mono"`
        ctx.textAlign = 'left'
        let i = 0
        // for (let line of fragmentShader.split('\n')) {
        //   i++
        //   ctx.fillText(line, 0, 0 + i * 20)
        // }
        // for (let line of vertexShader.split('\n')) {
        //   i++
        //   ctx.fillText(line, 0, h - i * 20)
        // }
        ctx.textAlign = 'center'
        // ctx.fillText(vertexShader, 0, h / 2)
        ctx.font = `${(w * 2) / state.current.text.length}px "Andale Mono"`
        ctx.translate(w / 2, h / 2)

        if (state.current.text) {
          ctx.fillStyle = 'white'
          for (let i = 1; i < 16; i++) {
            ctx.font = `${(w * 2) / state.current.text.length / i}px "Andale Mono"`
            ctx.fillText(state.current.text, 0, (w * 2) / state.current.text.length / 2 / i, w)
            ctx.translate(
              (i % 2 ? state.current.translate : -state.current.translate * 0.87) * w,
              0
            )
            ctx.rotate((i % 2 ? state.current.rotate : -state.current.rotate * 0.53) * Math.PI * 2)
          }
        }

        twgl.setTextureFromElement(gl, text.textTexture, textFrame.current)
      }
      drawText()
      const sound = () => {
        const speedChange = speeds.map((x, i) => previousSpeeds[i] - x)
        const change = (_.sum(speedChange) / speeds.length) * 100
        const averagePan = (_.sum(pan) / pan.length) * 1000
        const averageSpeed = _.sum(speeds) / speeds.length

        const PAN_CHANGE_SCALE = 0.1
        const noise = () => {
          const signal = el.pinknoise()
          let delayer = (i: number, signal: NodeRepr_t, amount: number) =>
            el.delay(
              { size: 44100 },
              el.ms2samps(el.const({ key: `delay-${i}`, value: amount })),
              0.1,
              signal
            )
          let start = signal
          const letters = state.current.text.split('').map((letter) => keys.indexOf(letter))

          for (let i = Math.max(letters.length - 10, 0); i < letters.length; i++) {
            start = delayer(i, start, 1000 / mtof(scale(letters[i], 0, 48, 30, 127)))
          }

          return start
        }
        const channel = (chan: 0 | 1) => {
          return el.mul(
            el.mul(
              el.lowpass(
                el.const({ key: 'lowpass', value: mtof(state.current.lowpass * 200) }),
                1,
                el.lowpass(
                  el.smooth(
                    el.tau2pole(2),
                    el.const({
                      key: 'freq',
                      value: _.clamp(500 + (change < 0 ? change * 500 : change * 4000), 100, 30000)
                    })
                  ),
                  scale(averageSpeed, 0, 20, 0, 1, 2),
                  noise()
                )
              ),
              // el.pinknoise()
              el.smooth(
                el.tau2pole(2),
                el.const({
                  key: `${chan}:pan`,
                  value: scale(
                    averagePan,
                    chan ? 0 : PAN_CHANGE_SCALE * -1,
                    chan ? PAN_CHANGE_SCALE : 0,
                    chan,
                    (chan + 1) % 2
                  )
                })
              )
            ),
            el.const({ key: 'volume', value: state.current.volume })
          )
        }
        core.render(channel(0), channel(1))
      }
      sound()
      lastTime = time
    },
    [
      {
        setup: ({ core, sound, soundReading: { speeds, previousSpeeds } }) => {
          let { sample } = sound
          sample++
          let speedChange = speeds.map((x, i) => previousSpeeds[i] - x)
          const maxSpeed = _.max(speedChange)!
          speedChange = speedChange.map((x) => x / maxSpeed)
          core.updateVirtualFileSystem({
            [`convolution-${sample}`]: speedChange
          })
          console.log(speedChange)

          console.log('resample', sample)

          return { sound: { ...sound, sample: sample } }
        },
        deps: [sample]
      }
    ]
  )

  const dragFrame = useRef<HTMLDivElement>(null!)

  const rangeRef = useRef([0, 0])
  useSlider(dragFrame, ({ x, y }) => {
    const baseFrequency = mtof(scale(x, 0, 1, 0, 127))
    const spread = scale(y, 0, 1, 1, 2)
    const [low, high] = [baseFrequency, baseFrequency * spread]
    rangeRef.current = [low, high]
  })

  const update = (newState: Partial<AppState>) => {
    state.current = { ...state.current, ...newState }
  }

  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(0)
  const [circleSize, setCircleSize] = useState(0)
  const [strength, setStrength] = useState(0.1)
  const [lock, setLock] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [translate, setTranslate] = useState(0)
  const updateAll = () => {
    update({
      speed: speed ** 2,
      circleSize: circleSize ** 3,
      strength: strength ** 5,
      rotate,
      translate: translate ** 2
    })
  }
  useEffect(() => {
    if (lock) return
    updateAll()
  }, [lock, speed, circleSize, strength, translate, rotate])

  return (
    <>
      <div className="h-screen w-screen" ref={dragFrame}>
        <canvas
          ref={frame}
          className="absolute top-0 left-[calc((100vw-100vh)/2)] h-screen aspect-square"
          height={1080}
          width={1080}
        />
        <canvas
          ref={textFrame}
          className="absolute top-0 left-[calc((100vw-100vh)/2)] h-screen aspect-square"
          height={1080}
          width={1080}
        />
        <div className="flex absolute bottom-0 left-0 space-x-2 p-2 z-20">
          {!animating && <button onClick={() => setAnimating(true)}>START</button>}
        </div>
        <div className="text-white font-mono">
          <button onClick={() => setLock(!lock)}>{lock ? 'unlock' : 'lock'}</button>
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
      </div>
    </>
  )
}
