import type { ConnectionStep } from '../../types/telemetry'

/**
 * Abstraction de la liaison telephone <-> automate.
 * En production, une implementation reelle lancerait le client OpenVPN
 * (profil .ovpn) puis ouvrirait l'URL fixe de l'interface une fois le tunnel up.
 */
export interface ConnectionService {
  connect(onProgress: (steps: ConnectionStep[]) => void): Promise<void>
  disconnect(): Promise<void>
}
