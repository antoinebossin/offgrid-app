import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ConnectionState, ConnectionStep } from '../types/telemetry'
import { MockConnectionService } from '../services/connection'
import { MockPlcDataSource, type PlcDataSource } from '../services/plc'

interface AppContextValue {
  state: ConnectionState
  steps: ConnectionStep[]
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  dataSource: PlcDataSource
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [steps, setSteps] = useState<ConnectionStep[]>([])

  // Services instancies une seule fois. Pour brancher l'automate reel,
  // remplacer ces deux lignes par les implementations de production.
  const connection = useRef(new MockConnectionService())
  const dataSource = useRef<PlcDataSource>(new MockPlcDataSource())

  const connect = useCallback(async () => {
    setState('connecting')
    try {
      await connection.current.connect(setSteps)
      dataSource.current.start()
      setState('connected')
    } catch {
      setState('error')
    }
  }, [])

  const disconnect = useCallback(async () => {
    dataSource.current.stop()
    await connection.current.disconnect()
    setSteps([])
    setState('disconnected')
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({ state, steps, connect, disconnect, dataSource: dataSource.current }),
    [state, steps, connect, disconnect],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
