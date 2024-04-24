import { mtof } from '../../../util/util'
import { produce } from 'immer'
import _ from 'lodash'
import { useRef } from 'react'
import { createWithEqualityFn } from 'zustand/traditional'
import { mapScale } from './util/scaling'

export const LENGTH = 1800

export type AppState = {
  ramp: number
  midi: {
    range: [number, number]
    scale: number[]
    notes: { key: number; started: false | number }[]
  }
  audio: {
    points: number[]
    points2: number[]
    speed: number
    mode: 'xor' | 'xorLR'
  }
}

export const useAppStore = createWithEqualityFn<AppState>(() => {
  const state: AppState = {
    ramp: 0.2,
    midi: {
      scale: [1],
      range: [0, 1],
      notes: _.range(6).map(() => ({ key: 0, started: false }))
    },
    audio: {
      points: _.range(LENGTH).map(() => 0),
      points2: _.range(LENGTH).map(() => 0),
      speed: 100,
      mode: 'xor'
    }
  }
  return state
})

const modify = (modifier: (state: AppState) => void) => {
  useAppStore.setState(produce(modifier))
}

export const setters = {
  set: (newState: Partial<AppState>) => {
    modify(() => newState)
  },
  setAudio: (newState: Partial<AppState['audio']>) => {
    modify(state => {
      state.audio = { ...state.audio, ...newState }
    })
  },
  setMidi: (newState: Partial<AppState['midi']>) => {
    modify(state => {
      state.midi = { ...state.midi, ...newState }
    })
  }
}

export const getters = {
  get: <T extends keyof AppState>(key: T) => useAppStore.getState()[key]
}

export const useAppStoreRef = <T>(callback: (state: AppState) => T) => {
  const storeValue: T = useAppStore(callback)
  const storeValueRef = useRef(storeValue)
  storeValueRef.current = storeValue
  return [storeValue, storeValueRef] as [
    typeof storeValue,
    typeof storeValueRef
  ]
}
