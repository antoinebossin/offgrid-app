import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { HistoryPoint, Snapshot } from '../types/telemetry'

/** S'abonne a la source de donnees et renvoie le dernier instantane + l'historique. */
export function useTelemetry() {
  const { dataSource } = useApp()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])

  useEffect(() => {
    const unsub = dataSource.subscribe((s) => {
      setSnapshot(s)
      setHistory(dataSource.getHistory())
    })
    setHistory(dataSource.getHistory())
    return unsub
  }, [dataSource])

  return { snapshot, history }
}
