import { AudioCtx, CanvasGL, Elementary, Mesh, Reactive } from '@animation-components/components'
import vert from './v.vert?raw'
import frag from './f.frag?raw'
import { rad } from '@util/math'
import _ from 'lodash'
import { useMemo, useRef } from 'react'
import * as twgl from 'twgl.js'

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
    return { positions, velocities, speeds }
  }, [])

  const state = useRef<AppState>({
    speed: 1,
    circleSize: 0.5,
    strength: 1,
    text: '',
    textOpacity: 0,
    rotation: 1,
    lowpass: 1,
    setSample: 0,
    opacity: 1,
    angle: 0,
    volume: 1,
    translate: 0,
    rotate: 0
  })

  return (
    <Reactive loop={true}>
      <CanvasGL name="canvas" className="h-full w-full top-0 left-0 fixed">
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
          draw={(self, { t, dt }, gl) => {
            self.draw({
              u_deltaTime: dt,
              u_time: t,
              u_sampler: twgl.createTexture(gl, {
                height: gl.canvas.height,
                width: gl.canvas.width
              }),
              u_circleSize: state.current.circleSize,
              u_speed: state.current.speed,
              u_resolution: [gl.canvas.width, gl.canvas.height],
              u_strength: state.current.strength,
              u_textTexture: twgl.createTexture(gl, {
                height: gl.canvas.height,
                width: gl.canvas.width
              }),
              opacity: state.current.opacity,
              angle: state.current.angle
            })
          }}
        />
      </CanvasGL>
      <AudioCtx name="audio">
        <Elementary
          name="elementary"
          setup={({ node, core, el }, ctx, parent) => {
            node.connect(ctx.destination)
            const channel = () => el.mul(el.noise(), 0.2)
            core.render(channel(), channel())
            return () => node.disconnect()
          }}
        />
      </AudioCtx>
    </Reactive>
  )
}
