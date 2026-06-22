import type { ConnectionService } from './ConnectionService'
import type { ConnectionStep } from '../../types/telemetry'
import { CONFIG } from '../config'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Sequence reproduisant fidelement le chemin reel d'etablissement de la liaison.
const STEP_DEFS = [
  { id: 'vpn', label: 'Lancement du tunnel OpenVPN', detail: `${CONFIG.vpn.endpoint} · ${CONFIG.vpn.protocol}`, duration: 1100 },
  { id: 'modem', label: 'Liaison modem 4G', detail: CONFIG.plc.modem, duration: 1200 },
  { id: 'tunnel', label: 'Établissement du tunnel chiffré', detail: CONFIG.vpn.cipher, duration: 1000 },
  { id: 'plc', label: "Connexion à l'automate", detail: `${CONFIG.plc.model} · ${CONFIG.plc.runtime}`, duration: 1100 },
  { id: 'data', label: 'Récupération des données EMS', detail: '46 points de mesure', duration: 1000 },
]

/**
 * Implementation SIMULEE (demo). Un navigateur ne peut pas lancer un VPN systeme :
 * on reproduit ici la sequence et les temporisations pour la demonstration.
 */
export class MockConnectionService implements ConnectionService {
  async connect(onProgress: (steps: ConnectionStep[]) => void): Promise<void> {
    const steps: ConnectionStep[] = STEP_DEFS.map((s) => ({
      id: s.id,
      label: s.label,
      detail: s.detail,
      status: 'pending',
    }))
    onProgress(steps.map((s) => ({ ...s })))

    for (let i = 0; i < STEP_DEFS.length; i++) {
      steps[i].status = 'active'
      onProgress(steps.map((s) => ({ ...s })))
      await sleep(STEP_DEFS[i].duration)
      steps[i].status = 'done'
      onProgress(steps.map((s) => ({ ...s })))
    }
    await sleep(250)
  }

  async disconnect(): Promise<void> {
    await sleep(150)
  }
}
