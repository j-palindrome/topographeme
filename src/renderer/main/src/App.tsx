import type { NodeRepr_t } from '@elemaudio/core'
import { el } from '@elemaudio/core'
import { useAnimation } from '@util/animation'
import { generateContexts } from '@util/setups'
import _ from 'lodash'
import type { default as pInstance } from 'p5'
import { useEffect, useRef, useState } from 'react'
import * as twgl from 'twgl.js'
import fragmentShader from './f.frag?raw'
import { keys } from './util/scaling'
import vertexShader from './v.vert?raw'
import { mtof, rad, scale } from '@util/math'
import { PixelArray } from '@util/pixels'
import { create } from '@util/formattings'
import { useEventListener, useSlider } from '@util/dom'

export default function Scene() {
  const state = useRef<AppState>({ speed: 1, circleSize: 0.5, strength: 1, text: '' })
  const [typedText, setTypedText] = useState('')
  useEffect(() => {
    window.electron.ipcRenderer.on('set', (_event, newState: Partial<AppState>) => {
      console.log('new state:', newState)
      state.current = { ...state.current, ...newState }
      if (typeof newState.text === 'string') {
        setTypedText(newState.text)
      }
    })
  }, [])
  const [animating, setAnimating] = useState(false)
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

  const setup4 = ({ gl, p5 }: { gl: WebGL2RenderingContext; p5: any }) => {
    const canvas = textFrame.current

    const pInstance: pInstance = new p5((p: pInstance) => {
      p.createCanvas(gl.canvas.width, gl.canvas.height, p.P2D, canvas)
      p.colorMode(p.HSL, 1)

      // p.background(create(p.color('gray'), e => e.setAlpha(0.5)))
      p.textAlign('center')
      p.fill('white')
      p.noStroke()
      p.textSize(100)
      p.textStyle(p.BOLD)
      // p.scale(1.0, 4.0)
    })

    const textTexture = twgl.createTexture(gl, {
      width: canvas.width,
      height: canvas.height
    })
    return { textTexture, pInstance, canvas }
  }

  const [scene, setScene] = useState(0)

  const props = useAnimation(
    animating,
    async () => {
      const contexts = await generateContexts(frame.current, {})
      const { gl, p5 } = contexts

      const part1 = setup1({ gl })
      const part2 = setup2({
        gl,
        tfBufferInfo1: part1.tfBufferInfo1,
        tfBufferInfo2: part1.tfBufferInfo2
      })
      const part3 = setup3({ gl })
      const part4 = setup4({ gl, p5 })

      const setup5 = async () => {
        const videoCanvas = document.createElement('video')
        videoCanvas.height = 480
        videoCanvas.width = 640
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
          videoCanvas.srcObject = stream
          videoCanvas.play()
        })
        const videoTexture = twgl.createTexture(gl, {
          width: videoCanvas.width,
          height: videoCanvas.height
        })
        const videoLayersTexture = twgl.createTexture(gl, {
          width: videoCanvas.width,
          height: videoCanvas.height
        })
        const videoLayersCanvas = create(document.createElement('canvas'), (e) => {
          e.height = videoCanvas.height
          e.width = videoCanvas.width
        }).getContext('2d')!

        return {
          videoCanvas,
          videoTexture,
          videoLayersCanvas,
          videoLayersTexture
        }
      }

      return {
        ...contexts,
        ...part1,
        ...part2,
        ...part3,
        ...part4,
        ...(await setup5()),
        text: ''
      }
    },
    (
      { time, timeDelta },
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
        textTexture,
        videoCanvas,
        videoTexture,
        videoLayersTexture
      }
    ) => {
      const visuals = () => {
        twgl.setTextureFromElement(gl, videoTexture, videoCanvas)
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
          u_deltaTime: timeDelta,
          u_time: time,
          u_sampler: tex,
          u_circleSize: state.current.circleSize,
          u_speed: state.current.speed,
          u_resolution: [gl.canvas.width, gl.canvas.height],
          u_strength: state.current.strength,
          u_textTexture: textTexture,
          u_videoTexture: videoTexture,
          u_videoLayersTexture: videoLayersTexture
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
      const speedChange = speeds.map((x, i) => previousSpeeds[i] - x)
      const change = (_.sum(speedChange) / speeds.length) * 100
      const averagePan = (_.sum(pan) / pan.length) * 1000
      // TODO: scan for holes
      const HOLE_SIZE = 16
      const holes: { index: [number, number]; size: number }[] = []

      let sampleStart: false | [number, number] = false
      let averageSample = 0
      for (let i = 0; i < array.length; i += 4) {
        const r = array[i]
        if (r < 30) {
          if (sampleStart && sampleStart[0] > 10) {
            // console.log('pushing')
            holes.push({ index: array.indexToXy(i), size: sampleStart[0] })
          }
          sampleStart = false
        } else {
          if (!sampleStart) sampleStart = [0, 0]
          sampleStart[0]++
        }
      }

      const maxHoles = _.sortBy(holes, 'size').slice(holes.length - 10)
      const PAN_CHANGE_SCALE = 0.1
      const noise = () => {
        const signal = el.noise()
        let delayer = (i: number, signal: NodeRepr_t, amount: number) =>
          el.delay(
            { size: 44100 },
            el.ms2samps(el.const({ key: `delay-${i}`, value: amount })),
            0.3,
            signal
          )
        let start = signal
        const letters = props.current.text.split('').map((letter) => keys.indexOf(letter))

        for (let i = Math.max(letters.length - 10, 0); i < letters.length; i++) {
          start = delayer(i, start, 1000 / mtof(scale(letters[i], 0, 48, 30, 127)))
        }
        return start
      }
      const channel = (chan: 0 | 1) => {
        return el.mul(
          el.lowpass(
            el.smooth(
              el.tau2pole(2),
              el.const({
                key: 'freq',
                value: 500 + (change < 0 ? change * 500 : change * 4000)
              })
            ),
            0.1,
            noise()
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
        )
      }
      core.render(channel(0), channel(1))
    },
    [
      {
        setup: ({ videoCanvas, videoLayersCanvas, videoLayersTexture, gl }) => {
          if (!scene) return
          videoLayersCanvas.globalAlpha = 0.5
          videoLayersCanvas.drawImage(videoCanvas, 0, 0)
          twgl.setTextureFromElement(gl, videoLayersTexture, videoLayersCanvas.canvas)
          const audios = ['1_1', '2', '3', '4', '5', '6', '7', '8']
          new Audio(`./recordings/${audios[scene - 1]}.m4a`).play()
        },
        cleanup: () => {},
        deps: [scene]
      }
    ],
    ({ canvas, pInstance }) => {
      canvas.remove()
      pInstance.remove()
    }
  )

  useEffect(() => {
    const { gl, pInstance: p, textTexture, canvas } = props.current
    if (!p) return
    p.push()
    p.clear()
    p.textAlign('center')
    let textSize = 10
    p.textSize(10)
    p.translate(p.width / 2, p.height / 2 + p.textAscent() / 2)
    p.text(typedText, 0, 0)

    for (let i = 1; i < 10; i++) {
      p.push()
      p.rotate(((Math.PI * 2) / 10) * i)
      p.translate((p.width / 100) * i, 0)
      p.text(typedText, 0, 0)
      p.pop()
    }
    p.pop()
    twgl.setTextureFromElement(gl, textTexture, canvas)
  }, [typedText])

  useEffect(() => {
    props.current.text = typedText
  }, [typedText])
  const [playing, setPlaying] = useState(true)

  const dragFrame = useRef<HTMLDivElement>(null!)

  const rangeRef = useRef([0, 0])
  useSlider(dragFrame, ({ x, y }) => {
    const baseFrequency = mtof(scale(x, 0, 1, 0, 127))
    const spread = scale(y, 0, 1, 1, 2)
    const [low, high] = [baseFrequency, baseFrequency * spread]
    rangeRef.current = [low, high]
  })

  return (
    <>
      <div className="h-screen w-screen" ref={dragFrame}>
        <canvas
          ref={frame}
          className="absolute top-0 left-0 h-screen w-screen"
          height={1080}
          width={1080}
        />
        <canvas
          ref={textFrame}
          height={1080}
          width={1080}
          className="!h-screen !w-screen absolute opacity-20 top-0 left-0 z-10"
        />
        <div className="flex absolute bottom-0 left-0 space-x-2 p-2 z-20">
          {!animating && <button onClick={() => setAnimating(true)}>START</button>}

          {/* <button
            onClick={() => {
              setScene(scene + 1)
            }}>
            next
          </button> */}
        </div>
      </div>
    </>
  )
}
