import {
  AudioCtx,
  CameraInput,
  Canvas2D,
  CanvasGL,
  Elementary,
  Mesh,
  Processing,
  Reactive,
  Texture,
  TopContextInfo
} from '@animation-components/components'
import vert from './v.vert?raw'
import frag from './f.frag?raw'
import { mtof, rad, scale } from '@util/math'
import _ from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as twgl from 'twgl.js'
import { keys } from './util/scaling'
import { NodeRepr_t } from '@elemaudio/core'
import { probLog } from '@util/dom'
import type p5 from 'p5'
import { defaultFragColor, defaultVert2D } from '@util/shaders/utilities'
import { glEs300 } from '../../../../util/src/shaders/utilities'

const text = `
__

One or two other people waited far down the platform, a man in a hooded sweatshirt was passed out or had passed away on one of the wooden seats, but otherwise we were alone, having just said our passionate farewell, staring at each other’s ghost in the quiet tunnel. 

Whom would he correspond with, what dead people? 

People have ascribed the Marfa Lights to ghosts, UFOs, or ignis fatuus, but researchers have suggested they are most likely the result of atmospheric reflections of automobile headlights and campfires; apparently sharp temperature gradients between cold and warm layers of air can produce those effects. 
	
I shut my eyes - whenever I shut my eyes in the city I become immediately aware of the wavelike sounds of traffic. 

She would often appear in my dreams, at least one of which resulted in nocturnal emission, the last time I would experience that phenomenon, although most of them were chaste, cliched — exploring Paris hand in hand, etc. 

I decided to replace the book I’d proposed with the book you’re reading now, a work that, like a poem, is neither fiction nor non fiction, but a flickering between them; I resolved to dilate my story 	not int a novel about literary fraudulence, about fabricating the past, but into an actual present alive with multiple futures. 

Only here it’s a presence, not an absence, that eats away at her hand: she’s being pulled into the future. 

Maybe it’s how she grapples with the threat of voicelessness.`.split('\n\n')

export default function App() {
  const { positions, velocities, speeds } = useMemo(() => {
    const numParticles = ((window.innerWidth / 3) * window.innerHeight) / 3
    const positions: number[] = []
    const velocities: number[] = []
    const speeds: number[] = []
    for (let i = 0; i < numParticles; i++) {
      positions.push(_.random(-1, 1, true), _.random(-1, 1, true))
      velocities.push(Math.sin(rad(i / numParticles)), Math.cos(rad(i / numParticles)))
      speeds.push(1.0)
    }
    return {
      positions: new Float32Array(positions),
      velocities: new Float32Array(velocities),
      speeds: new Float32Array(speeds)
    }
  }, [])

  const state = useRef<AppState>({
    speed: 0.4,
    circleSize: 0.2,
    strength: 0.5,
    text: '',
    textOpacity: 0,
    rotation: 1,
    lowpass: 1,
    setSample: 0,
    opacity: 0.2,
    angle: 0,
    volume: 1,
    translate: 0,
    rotate: 0,
    pauseVideo: 0
  })
  const [pauseVideo, setPauseVideo] = useState(0)
  useEffect(() => {
    window.electron.ipcRenderer.on('set', (_event, newState: Partial<AppState>) => {
      state.current = { ...state.current, ...newState }
      if (typeof newState.pauseVideo !== 'undefined') {
        setPauseVideo(newState.pauseVideo)
      }
    })
  }, [])

  const propsRef = useRef({
    soundReading: {
      speeds: new Float32Array(speeds.length),
      previousSpeeds: new Float32Array(speeds.length),
      pan: new Float32Array(speeds.length),
      previousPan: new Float32Array(speeds.length),
      headings: new Float32Array(velocities.length)
    }
  })

  type Names = {
    tex: WebGLTexture
    textTex: WebGLTexture
    videoTex: WebGLTexture
    videoPauseTex: WebGLTexture
    textCanvas: CanvasRenderingContext2D
    videoIn: HTMLVideoElement
    videoPauses: CanvasRenderingContext2D
  }

  return (
    <>
      <Reactive loop={true}>
        <Canvas2D
          name="textCanvas"
          hidden
          height={1080}
          width={1080}
          resize={false}
          setup={(ctx) => {
            const w = ctx.canvas.width
            const h = ctx.canvas.height
            ctx.resetTransform()
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.font = `${20}px "Andale Mono"`
            ctx.textAlign = 'left'
            let i = 0
            ctx.textAlign = 'center'
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
                ctx.rotate(
                  (i % 2 ? state.current.rotate : -state.current.rotate * 0.53) * Math.PI * 2
                )
              }
            }
          }}
        />

        <CameraInput name="videoIn" width={1080} height={1080} />

        <Canvas2D
          name="videoPauses"
          hidden
          className="absolute top-0 left-0 h-screen w-screen"
          height={1080}
          width={1080}
          resize={false}
          setup={(ctx, { elements }) => {
            const { videoIn } = elements as Names

            if (!videoIn) return
            ctx.globalAlpha = 0.5
            ctx.drawImage(videoIn, 0, 0, ctx.canvas.width, ctx.canvas.height)
          }}
          deps={[pauseVideo]}
        />
        <CanvasGL
          name="canvas"
          className="absolute top-0 left-0 opacity-50 h-screen w-screen"
          height={1080}
          width={1080}
          resize={false}
          setup={(gl) => {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.enable(gl.BLEND)
          }}
        >
          <Mesh
            name="particleSystem"
            drawMode={'points'}
            vertexShader={vert}
            fragmentShader={frag}
            attributes={{
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
            }}
            transformFeedback={[
              ['a_positionOut', 'a_positionIn'],
              ['a_velocityOut', 'a_velocity'],
              ['a_speedOut', 'a_speedIn'],
              ['a_audioOut', 'a_audioOut']
            ]}
            draw={(self, gl, { time: { t, dt }, elements }) => {
              const { soundReading } = propsRef.current
              const { tex, textTex, videoTex, videoPauseTex } = elements as Names

              self.draw({
                u_deltaTime: dt,
                u_time: t,
                u_sampler: tex,
                u_circleSize: state.current.circleSize,
                u_speed: state.current.speed,
                u_resolution: [gl.canvas.width, gl.canvas.height],
                u_strength: state.current.strength,
                u_textTexture: textTex,
                u_videoTexture: videoTex,
                u_videoPauseTexture: videoPauseTex,
                opacity: state.current.opacity,
                angle: state.current.angle
              })

              soundReading.previousSpeeds.set(speeds)
              soundReading.previousPan.set(soundReading.pan)
              gl.bindBuffer(
                gl.TRANSFORM_FEEDBACK_BUFFER,
                self.bufferInfo.attribs!.a_speedOut.buffer
              )
              gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, speeds)
              gl.bindBuffer(
                gl.TRANSFORM_FEEDBACK_BUFFER,
                self.bufferInfo.attribs!.a_audioOut.buffer
              )
              gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, soundReading.pan)
            }}
          />

          <Texture
            name="tex"
            draw={(self, gl, time) => {
              gl.bindTexture(gl.TEXTURE_2D, self)
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.canvas.width,
                gl.canvas.height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                gl.canvas
              )
            }}
          />
          <Texture
            name="textTex"
            draw={(self, gl, { elements }) => {
              const { textCanvas } = elements as Names
              twgl.setTextureFromElement(gl, self, textCanvas.canvas)
            }}
          />
          <Texture
            name="videoTex"
            width={1080}
            height={1080}
            setup={(self, gl, { elements }) => {
              const { videoIn } = elements as Names
              twgl.setTextureFromElement(gl, self, videoIn)
            }}
          />
          <Texture
            name="videoPauseTex"
            width={1080}
            height={1080}
            setup={(self, gl, { elements }) => {
              const { videoPauses } = elements as Names
              twgl.setTextureFromElement(gl, self, videoPauses.canvas)
            }}
            deps={[pauseVideo]}
          />
        </CanvasGL>

        <AudioCtx name="audio">
          <Elementary
            name="elementary"
            setup={({ node, core, el }, ctx) => {
              node.connect(ctx.destination)
              const channel = () => el.mul(el.noise(), 0.2)
              core.render(channel(), channel())
              return () => node.disconnect()
            }}
            draw={({ core, el }) => {
              const { soundReading } = propsRef.current
              const speedChange = speeds.map((x, i) => soundReading.previousSpeeds[i] - x)
              const change = (_.sum(speedChange) / speeds.length) * 100
              const averagePan = (_.sum(soundReading.pan) / soundReading.pan.length) * 1000
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
                            value: _.clamp(
                              500 + (change < 0 ? change * 500 : change * 4000),
                              100,
                              30000
                            )
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
            }}
          />
        </AudioCtx>
      </Reactive>
      <div className="top-0 left-0 h-screen w-screen absolute flex items-center justify-center">
        <div className="mx-[20%] text-white font-mono">{text[pauseVideo]}</div>
      </div>
    </>
  )
}
