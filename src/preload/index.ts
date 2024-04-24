import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

contextBridge.exposeInMainWorld('electron', electronAPI)
