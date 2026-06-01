import type { PlcDataSource } from './PlcDataSource'
import type { HistoryPoint, Snapshot } from '../../types/telemetry'
import { CONFIG } from '../config'

// Acceleration du temps simule : 1 s reelle = SIM_DT s simulees,
// pour que le cycle jour/nuit et la batterie evoluent visiblement en demo.
const SIM_DT = 90
const BATTERY_CAPACITY_WH = 15000
const PV_PEAK_W = 6000

/**
 * Modele physique simplifie d'une maison autonome (PV + thermique + batterie
 * + bouilleur), pilotee par un EMS. Sert de "jumeau" pour la demo : memes
 * grandeurs, memes ordres de grandeur que l'installation reelle.
 */
export class MockPlcDataSource implements PlcDataSource {
  private values: Record<string, number> = {}
  private history: HistoryPoint[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private subscribers = new Set<(s: Snapshot) => void>()
  private clockH: number

  constructor() {
    const now = new Date()
    this.clockH = now.getHours() + now.getMinutes() / 60
    this.seed()
  }

  // --- API publique --------------------------------------------------------

  start(): void {
    if (this.timer !== null) return
    if (this.history.length === 0) {
      const now = Date.now()
      for (let i = 30; i >= 1; i--) {
        this.step(SIM_DT)
        this.history[this.history.length - 1].t = now - i * CONFIG.pollingIntervalMs
      }
    }
    this.timer = setInterval(() => {
      this.step(SIM_DT)
      const snap = this.snapshot()
      this.subscribers.forEach((cb) => cb(snap))
    }, CONFIG.pollingIntervalMs)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  subscribe(cb: (s: Snapshot) => void): () => void {
    this.subscribers.add(cb)
    cb(this.snapshot())
    return () => {
      this.subscribers.delete(cb)
    }
  }

  getHistory(): HistoryPoint[] {
    return [...this.history]
  }

  getValue(id: string): number {
    return this.values[id] ?? 0
  }

  async writeParameter(id: string, value: number): Promise<void> {
    // Simule la latence d'ecriture a travers le tunnel.
    await new Promise<void>((r) => setTimeout(r, 450))
    this.values[id] = value
    const snap = this.snapshot()
    this.subscribers.forEach((cb) => cb(snap))
  }

  // --- Interne -------------------------------------------------------------

  private rand(amp: number): number {
    return (Math.random() - 0.5) * 2 * amp
  }

  private snapshot(): Snapshot {
    return { t: Date.now(), values: { ...this.values } }
  }

  private seed(): void {
    // Parametres EMS pilotables (valeurs par defaut)
    this.values.ems_mode = 0
    this.values.ems_hotwater_setpoint = 55
    this.values.ems_soc_min = 30
    this.values.ems_charge_priority = 2
    this.values.ems_load_shedding = 1
    this.values.ems_backup_heater = 0
    // Etats persistants
    this.values.battery_soc = 74
    this.values.battery_soh = 97
    this.values.battery_charged_today = 6.4
    this.values.battery_discharged_today = 3.1
    this.values.pv_energy_today = 12.7
    this.values.load_energy_today = 9.8
    this.step(0)
  }

  private step(dt: number): void {
    this.clockH = (this.clockH + dt / 3600) % 24
    const h = this.clockH
    const v = this.values

    // --- Environnement
    v.env_outdoor_temp = 8 + 7 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + this.rand(0.4)
    v.env_indoor_temp = 20 + 1.4 * Math.sin(((h - 14) / 24) * 2 * Math.PI) + this.rand(0.15)
    v.env_humidity = clamp(62 + 14 * Math.sin(h / 3) + this.rand(2), 25, 99)
    v.env_wind = Math.max(0, 12 + 8 * Math.sin(h / 2) + this.rand(2.5))

    // --- Solaire (cloche de jour 6h-20h, pic a 13h) + variation nuageuse
    const day = Math.max(0, Math.sin(((h - 6) / 14) * Math.PI))
    const cloud = clamp(0.78 + 0.22 * Math.sin(h * 1.7 + 1), 0.45, 1)
    v.env_irradiance = Math.max(0, 1000 * day * cloud + this.rand(15))

    // --- Photovoltaique
    const pv = Math.max(0, PV_PEAK_W * day * cloud + this.rand(70))
    v.pv_power = pv
    v.pv_string1_power = pv * 0.52
    v.pv_string2_power = pv * 0.48
    v.pv_voltage = pv > 50 ? 382 + this.rand(7) : 0
    v.pv_current = v.pv_voltage > 0 ? pv / v.pv_voltage : 0

    // --- Solaire thermique + ballon
    const th = Math.max(0, 2500 * day + this.rand(50))
    v.thermal_power = th
    v.thermal_collector_temp = 18 + 62 * day + this.rand(1.5)
    const hwSet = v.ems_hotwater_setpoint
    v.thermal_tank_top = clamp(34 + 26 * day, 30, hwSet + 4) + this.rand(0.5)
    v.thermal_tank_bottom = v.thermal_tank_top - 8 + this.rand(0.4)
    v.thermal_flow = th > 120 ? 3.2 + this.rand(0.25) : 0

    // --- Fourneau bouilleur (soir / froid)
    const cold = v.env_outdoor_temp < 10
    const boilerOn = (h < 8 || h > 18) && cold ? 1 : 0
    v.boiler_state = boilerOn
    v.boiler_temp = boilerOn ? 185 + this.rand(12) : 24 + this.rand(2)
    v.boiler_flow_temp = boilerOn ? 62 + this.rand(1.5) : 28 + this.rand(1)

    // --- Consommation maison (pics matin ~7h30 et soir ~19h30)
    const morning = Math.exp(-Math.pow(h - 7.5, 2) / 2)
    const evening = Math.exp(-Math.pow(h - 19.5, 2) / 3)
    let load = 320 + 1500 * morning + 2200 * evening + 260 * day + this.rand(55)
    if (v.ems_backup_heater === 1) load += 1500
    v.load_power = load
    v.load_circuit_heating = load * 0.4
    v.load_circuit_hotwater = boilerOn ? 0 : load * 0.2
    v.load_circuit_general = load * 0.4

    // --- Batterie : equilibre electrique pv - conso
    let batt = pv - load // + => charge
    const soc = v.battery_soc
    if (batt > 0 && soc >= 100) batt = 0
    if (batt < 0 && soc <= 3) batt = 0
    v.battery_power = batt
    v.battery_voltage = 48 + (soc - 50) * 0.03 + this.rand(0.08)
    v.battery_current = batt / v.battery_voltage
    v.battery_temp = 22 + Math.abs(batt) / PV_PEAK_W * 3 + this.rand(0.3)
    const dSoc = (batt * (dt / 3600)) / BATTERY_CAPACITY_WH * 100
    const newSoc = clamp(soc + dSoc, 2, 100)
    v.battery_soc = newSoc

    // --- Onduleur
    v.inverter_state = 1
    v.inverter_power = load
    v.inverter_ac_voltage = 230 + this.rand(1.4)
    v.inverter_frequency = 50 + this.rand(0.04)
    v.inverter_temp = 30 + (load / PV_PEAK_W) * 20 + this.rand(0.4)

    // --- Reseau : ilote sauf si batterie sous le seuil ET delestage off
    const needGrid = newSoc < v.ems_soc_min - 12 && v.ems_load_shedding === 0
    v.grid_connected = needGrid ? 1 : 0
    v.grid_import_power = needGrid ? Math.max(0, load - pv) : 0
    v.grid_export_power = 0

    // --- Compteurs d'energie du jour
    v.pv_energy_today += (pv * (dt / 3600)) / 1000
    v.load_energy_today += (load * (dt / 3600)) / 1000
    if (batt > 0) v.battery_charged_today += (batt * (dt / 3600)) / 1000
    else v.battery_discharged_today += (-batt * (dt / 3600)) / 1000

    // --- Historique pour les graphes
    this.history.push({ t: Date.now(), pv, load, battery: batt, soc: newSoc })
    if (this.history.length > CONFIG.historyLength) this.history.shift()
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
