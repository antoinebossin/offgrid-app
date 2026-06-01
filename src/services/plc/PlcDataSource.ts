import type { HistoryPoint, Snapshot } from '../../types/telemetry'

/**
 * Source de donnees de l'automate. C'est LE point d'extension : remplacer
 * MockPlcDataSource par une implementation reelle (lecture/ecriture des
 * variables Codesys via WebVisu / Modbus TCP / fichier sur carte SD) suffit
 * a brancher l'installation, sans toucher a l'UI.
 */
export interface PlcDataSource {
  start(): void
  stop(): void
  subscribe(cb: (s: Snapshot) => void): () => void
  getHistory(): HistoryPoint[]
  getValue(id: string): number
  /** Ecriture d'un parametre pilotable (avec garde-fous cote UI). */
  writeParameter(id: string, value: number): Promise<void>
}
