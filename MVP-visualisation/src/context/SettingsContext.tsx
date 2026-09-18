import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthSettings, Settings } from '../types/settings'
import {
  factorySettings,
  hasLocalSettings,
  loadSettings,
  resetSettings,
  saveSettings,
  subscribeSettings,
} from '../services/settings/settingsStore'

interface SettingsContextValue {
  settings: Settings
  /** Enregistre les reglages issus d'une modification de l'utilisateur. */
  update: (next: Settings) => void
  /** Raccourci : ne modifie que le bloc `auth`. */
  updateAuth: (next: AuthSettings) => void
  /** Revient aux valeurs d'usine de la build (efface la config locale). */
  reset: () => void
  /** Une configuration a-t-elle deja ete enregistree sur cet appareil ? */
  isLocal: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [isLocal, setIsLocal] = useState<boolean>(hasLocalSettings)

  // Le stockage est la source de verite : tout ecran qui enregistre declenche
  // une relecture, y compris depuis un autre onglet.
  useEffect(() => {
    const sync = () => {
      setSettings(loadSettings())
      setIsLocal(hasLocalSettings())
    }
    const unsubscribe = subscribeSettings(sync)
    window.addEventListener('storage', sync)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', sync)
    }
  }, [])

  const update = useCallback((next: Settings) => saveSettings(next), [])
  const updateAuth = useCallback(
    (auth: AuthSettings) => saveSettings({ ...loadSettings(), auth }),
    [],
  )
  const reset = useCallback(() => resetSettings(), [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, updateAuth, reset, isLocal }),
    [settings, update, updateAuth, reset, isLocal],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>')
  return ctx
}

/** Valeurs d'usine de la build — utile pour proposer une remise a zero. */
export { factorySettings }
