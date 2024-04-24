import _ from 'lodash'
import * as Tone from 'tone'
import { setters, useAppStore } from '../store'
import { keys } from '../util/scaling'
import { useEventListener } from '../../../../util/util'
import SliderRange from './SliderRange'

export default function Piano() {
  const notes = useAppStore(state => state.midi.notes)

  useEventListener(
    'keydown',
    (ev: KeyboardEvent) => {
      const keyString = ev.key.replace('Key', '').toLowerCase()
      const key = keys.indexOf(keyString)
      console.log('key:', key)
      if (key === -1) return

      if (notes.find(synth => synth.started && synth.key === key)) {
        ev.stopImmediatePropagation()
        return
      }

      let voiceIndex = notes.findIndex(synth => !synth.started)
      if (voiceIndex === -1)
        voiceIndex = notes.indexOf(
          _.minBy(
            notes.filter(voice => voice.started !== null),
            'started'
          )!
        )

      const newNotes = [...notes]
      newNotes[voiceIndex] = { started: Tone.now(), key }
      setters.setMidi({ notes: newNotes })
    },
    [notes]
  )

  useEventListener(
    'keyup',
    (ev: KeyboardEvent) => {
      const keyString = ev.key.replace('Key', '').toLowerCase()
      const key = keys.indexOf(keyString)
      if (key === -1) return

      const voiceIndex = notes.findIndex(x => x.key === key && x.started)
      if (voiceIndex === -1) {
        ev.stopImmediatePropagation()
        return
      }
      const newNotes = [...notes]
      newNotes[voiceIndex] = { started: false, key }
      setters.setMidi({ notes: newNotes })
    },
    [notes]
  )

  return (
    <div className='space-y-2'>
      <SliderRange
        range={[-50, 123]} // 0.5 to 10,000 HZ
        onChange={([low, high]) => {
          setters.setMidi({ range: [low, high] })
        }}
      />
    </div>
  )
}
