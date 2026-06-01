// ---------------------------------------------------------------------------
// Types partages entre la couche services (connexion VPN + automate) et l'UI.
// ---------------------------------------------------------------------------

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type StepStatus = 'pending' | 'active' | 'done' | 'error'

/** Une etape de l'etablissement du tunnel OpenVPN, affichee a l'ecran. */
export interface ConnectionStep {
  id: string
  label: string
  detail?: string
  status: StepStatus
}

export type MetricCategory =
  | 'pv'
  | 'thermal'
  | 'boiler'
  | 'battery'
  | 'inverter'
  | 'load'
  | 'grid'
  | 'environment'
  | 'ems'

/** Definition statique d'un point de mesure de l'EMS. */
export interface MeasurementPoint {
  id: string
  label: string
  unit: string
  category: MetricCategory
  decimals?: number
  /** Pour les grandeurs enumerees (mode, etat marche/arret...). */
  enumLabels?: string[]
  /** true => parametre modifiable a distance (pilotage). */
  writable?: boolean
}

/** Instantane des valeurs renvoyees par l'automate. */
export interface Snapshot {
  t: number
  values: Record<string, number>
}

/** Point d'historique pour les graphes temps reel. */
export interface HistoryPoint {
  t: number
  pv: number
  load: number
  battery: number // puissance signee : + charge / - decharge
  soc: number
}
