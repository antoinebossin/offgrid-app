import type { MeasurementPoint, MetricCategory } from '../types/telemetry'

// Metadonnees par categorie (libelle + couleur d'accent).
export const CATEGORY_META: Record<MetricCategory, { label: string; color: string }> = {
  pv: { label: 'Photovoltaïque', color: '#F59E0B' },
  thermal: { label: 'Solaire thermique', color: '#FB923C' },
  boiler: { label: 'Fourneau bouilleur', color: '#EF4444' },
  battery: { label: 'Batterie', color: '#34D399' },
  inverter: { label: 'Onduleur', color: '#38BDF8' },
  load: { label: 'Consommation maison', color: '#A78BFA' },
  grid: { label: 'Réseau', color: '#94A3B8' },
  environment: { label: 'Environnement', color: '#2DD4BF' },
  ems: { label: 'EMS — pilotage', color: '#60A5FA' },
}

// ~46 points de mesure, representatifs de l'installation de Montchauvel.
export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  // --- Photovoltaique
  { id: 'pv_power', label: 'Puissance PV', unit: 'W', category: 'pv' },
  { id: 'pv_voltage', label: 'Tension PV', unit: 'V', category: 'pv', decimals: 1 },
  { id: 'pv_current', label: 'Courant PV', unit: 'A', category: 'pv', decimals: 1 },
  { id: 'pv_energy_today', label: 'Énergie PV (jour)', unit: 'kWh', category: 'pv', decimals: 1 },
  { id: 'pv_string1_power', label: 'String 1', unit: 'W', category: 'pv' },
  { id: 'pv_string2_power', label: 'String 2', unit: 'W', category: 'pv' },

  // --- Solaire thermique
  { id: 'thermal_collector_temp', label: 'Temp. capteur', unit: '°C', category: 'thermal', decimals: 1 },
  { id: 'thermal_tank_top', label: 'Ballon haut', unit: '°C', category: 'thermal', decimals: 1 },
  { id: 'thermal_tank_bottom', label: 'Ballon bas', unit: '°C', category: 'thermal', decimals: 1 },
  { id: 'thermal_power', label: 'Puissance thermique', unit: 'W', category: 'thermal' },
  { id: 'thermal_flow', label: 'Débit circulateur', unit: 'L/min', category: 'thermal', decimals: 1 },

  // --- Fourneau bouilleur
  { id: 'boiler_state', label: 'État fourneau', unit: '', category: 'boiler', enumLabels: ['Arrêt', 'Marche'] },
  { id: 'boiler_temp', label: 'Temp. foyer', unit: '°C', category: 'boiler', decimals: 0 },
  { id: 'boiler_flow_temp', label: 'Temp. départ', unit: '°C', category: 'boiler', decimals: 1 },

  // --- Batterie
  { id: 'battery_soc', label: 'État de charge', unit: '%', category: 'battery', decimals: 0 },
  { id: 'battery_voltage', label: 'Tension', unit: 'V', category: 'battery', decimals: 1 },
  { id: 'battery_current', label: 'Courant', unit: 'A', category: 'battery', decimals: 1 },
  { id: 'battery_power', label: 'Puissance', unit: 'W', category: 'battery' },
  { id: 'battery_temp', label: 'Température', unit: '°C', category: 'battery', decimals: 1 },
  { id: 'battery_soh', label: 'État de santé', unit: '%', category: 'battery', decimals: 0 },
  { id: 'battery_charged_today', label: 'Chargé (jour)', unit: 'kWh', category: 'battery', decimals: 1 },
  { id: 'battery_discharged_today', label: 'Déchargé (jour)', unit: 'kWh', category: 'battery', decimals: 1 },

  // --- Onduleur
  { id: 'inverter_state', label: 'État onduleur', unit: '', category: 'inverter', enumLabels: ['Arrêt', 'Marche'] },
  { id: 'inverter_power', label: 'Puissance AC', unit: 'W', category: 'inverter' },
  { id: 'inverter_ac_voltage', label: 'Tension AC', unit: 'V', category: 'inverter', decimals: 1 },
  { id: 'inverter_frequency', label: 'Fréquence', unit: 'Hz', category: 'inverter', decimals: 2 },
  { id: 'inverter_temp', label: 'Température', unit: '°C', category: 'inverter', decimals: 1 },

  // --- Consommation maison
  { id: 'load_power', label: 'Puissance totale', unit: 'W', category: 'load' },
  { id: 'load_energy_today', label: 'Énergie (jour)', unit: 'kWh', category: 'load', decimals: 1 },
  { id: 'load_circuit_heating', label: 'Circuit chauffage', unit: 'W', category: 'load' },
  { id: 'load_circuit_hotwater', label: 'Circuit eau chaude', unit: 'W', category: 'load' },
  { id: 'load_circuit_general', label: 'Circuit général', unit: 'W', category: 'load' },

  // --- Reseau
  { id: 'grid_connected', label: 'État réseau', unit: '', category: 'grid', enumLabels: ['Îloté', 'Connecté'] },
  { id: 'grid_import_power', label: 'Import réseau', unit: 'W', category: 'grid' },
  { id: 'grid_export_power', label: 'Export réseau', unit: 'W', category: 'grid' },

  // --- Environnement
  { id: 'env_outdoor_temp', label: 'Temp. extérieure', unit: '°C', category: 'environment', decimals: 1 },
  { id: 'env_indoor_temp', label: 'Temp. intérieure', unit: '°C', category: 'environment', decimals: 1 },
  { id: 'env_irradiance', label: 'Ensoleillement', unit: 'W/m²', category: 'environment' },
  { id: 'env_humidity', label: 'Humidité', unit: '%', category: 'environment', decimals: 0 },
  { id: 'env_wind', label: 'Vent', unit: 'km/h', category: 'environment', decimals: 0 },

  // --- EMS (parametres pilotables a distance)
  { id: 'ems_mode', label: 'Mode EMS', unit: '', category: 'ems', writable: true, enumLabels: ['Auto', 'Éco', 'Confort', 'Secours'] },
  { id: 'ems_hotwater_setpoint', label: 'Consigne eau chaude', unit: '°C', category: 'ems', writable: true, decimals: 0 },
  { id: 'ems_soc_min', label: 'Réserve batterie mini', unit: '%', category: 'ems', writable: true, decimals: 0 },
  { id: 'ems_charge_priority', label: 'Priorité de charge', unit: '', category: 'ems', writable: true, enumLabels: ['Batterie', 'Eau chaude', 'Équilibré'] },
  { id: 'ems_load_shedding', label: 'Délestage auto', unit: '', category: 'ems', writable: true, enumLabels: ['Désactivé', 'Activé'] },
  { id: 'ems_backup_heater', label: 'Appoint électrique', unit: '', category: 'ems', writable: true, enumLabels: ['Désactivé', 'Activé'] },
]

export const POINTS_BY_ID: Record<string, MeasurementPoint> = Object.fromEntries(
  MEASUREMENT_POINTS.map((p) => [p.id, p] as [string, MeasurementPoint]),
)

export function pointsByCategory(category: MetricCategory): MeasurementPoint[] {
  return MEASUREMENT_POINTS.filter((p) => p.category === category)
}
