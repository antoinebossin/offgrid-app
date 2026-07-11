// ---------------------------------------------------------------------------
// Types partages entre la couche services (connexion VPN + automate) et l'UI.
// Le modele colle desormais aux VRAIES variables CODESYS de l'installation
// de Montchauvel (WAGO 750-8217). Chaque point de mesure porte le nom exact
// de sa variable Codesys, pour servir de cible a reproduire dans la WebVisu.
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

/** Regroupements pour l'affichage et le code d'accent. */
export type MetricGroup =
  | 'battery'
  | 'ballon'
  | 'boiler'
  | 'valves'
  | 'ambient'
  | 'pv'
  | 'flows'
  | 'ems'

/** Niveau d'une ampoule d'alarme (feu tricolore Codesys). */
export type LedLevel = 'green' | 'amber' | 'red'

/** Definition statique d'un point de mesure de l'EMS. */
export interface MeasurementPoint {
  id: string
  label: string
  unit: string
  group: MetricGroup
  /** Nom exact de la variable Codesys (pour la cible WebVisu). */
  codesys?: string
  decimals?: number
  /** Pour les grandeurs enumerees (etat marche/arret, ouvert/ferme...). */
  enumLabels?: string[]
  /** true => parametre modifiable a distance (pilotage). */
  writable?: boolean
  /** true => variable pas encore definie cote Codesys (placeholder cible). */
  todo?: boolean
}

/** Instantane des valeurs renvoyees par l'automate (booleens = 0/1). */
export interface Snapshot {
  t: number
  values: Record<string, number>
}

/** Point d'historique pour le graphe de repartition de la puissance PV. */
export interface HistoryPoint {
  t: number
  pv: number       // G_Computed.gPV_Power
  battery: number  // G_Sensors.gBatterie_Puissance (+ charge / - decharge)
  ev: number       // borne de charge EV (a definir)
  ballon: number   // G_Computed.gPuissance_myPV_Totale_Cable_Rest
  soc: number      // G_Sensors.gBatterie_SOC
}
