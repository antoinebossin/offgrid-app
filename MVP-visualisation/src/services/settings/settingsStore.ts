// ---------------------------------------------------------------------------
// Stockage des reglages sur l'appareil.
//
// Regle : la configuration locale, quand elle existe, fait autorite. Sinon on
// retombe sur les valeurs d'usine de src/config.ts — presentes dans la build
// d'un site livre (Montchauvel), absentes de la build generique destinee au
// Play Store, qui demarre donc non configuree.
//
// Rien n'est ecrit tant que l'utilisateur n'a rien modifie : une build
// prereglee fonctionne sans que le stockage local contienne quoi que ce soit.
// ---------------------------------------------------------------------------

import { CONFIG, FACTORY_PRESET } from '../../config'
import type { Settings } from '../../types/settings'

const KEY = 'ofg.settings'
const VERSION = 1

interface Stored {
  version: number
  settings: Settings
}

/** Reglages vierges — build generique, premier demarrage. */
export function blankSettings(): Settings {
  return {
    site: { name: 'Off-the-Grid', tagline: 'Installation non configurée', location: '', logoSrc: null },
    plc: { model: '', runtime: '', modem: '', dataUrl: '' },
    vpn: { profile: '' },
    auth: {
      enabled: true,
      salt: '',
      hash: '',
      recoverySalt: '',
      recoveryHash: '',
      iterations: CONFIG.auth.iterations,
      unlockMinutes: CONFIG.auth.unlockMinutes,
      maxAttempts: CONFIG.auth.maxAttempts,
      lockoutSeconds: CONFIG.auth.lockoutSeconds,
    },
  }
}

/** Reglages d'usine de la build courante. */
export function factorySettings(): Settings {
  if (!FACTORY_PRESET) return blankSettings()
  return {
    site: { ...CONFIG.site },
    plc: { ...CONFIG.plc },
    vpn: { profile: CONFIG.vpn.profile },
    auth: {
      enabled: CONFIG.auth.enabled,
      salt: CONFIG.auth.salt,
      hash: CONFIG.auth.hash,
      recoverySalt: '',
      recoveryHash: '',
      iterations: CONFIG.auth.iterations,
      unlockMinutes: CONFIG.auth.unlockMinutes,
      maxAttempts: CONFIG.auth.maxAttempts,
      lockoutSeconds: CONFIG.auth.lockoutSeconds,
    },
  }
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    return parsed && parsed.version === VERSION ? parsed : null
  } catch {
    return null
  }
}

export function loadSettings(): Settings {
  return read()?.settings ?? factorySettings()
}

/** L'utilisateur a-t-il deja enregistre une configuration sur cet appareil ? */
export function hasLocalSettings(): boolean {
  return read() !== null
}

/** L'app sait-elle ou joindre l'automate ? */
export function isConfigured(settings: Settings): boolean {
  return settings.plc.dataUrl.trim().length > 0
}

// --- Abonnement (les ecrans se reaffichent quand les reglages changent) -----

const listeners = new Set<() => void>()

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(): void {
  listeners.forEach((fn) => fn())
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, settings } satisfies Stored))
  } catch {
    // Stockage indisponible (navigation privee, quota) : les reglages ne
    // survivront pas a la fermeture, mais l'app reste utilisable.
  }
  notify()
}

/** Efface la configuration locale et revient aux valeurs d'usine. */
export function resetSettings(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* rien de plus a faire */
  }
  notify()
}
