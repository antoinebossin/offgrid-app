// Helpers de formatage pour l'affichage.

export function fmtNumber(v: number, decimals = 0): string {
  if (!isFinite(v)) return '—'
  return v.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Puissance en W, bascule en kW au-dela de 1000. */
export function fmtPower(w: number): { value: string; unit: string } {
  const a = Math.abs(w)
  if (a >= 1000) return { value: fmtNumber(w / 1000, 2), unit: 'kW' }
  return { value: fmtNumber(Math.round(w)), unit: 'W' }
}

export function fmtClock(t: number): string {
  const d = new Date(t)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const EMS_MODES = ['Auto', 'Éco', 'Confort', 'Secours']
export const CHARGE_PRIORITIES = ['Batterie', 'Eau chaude', 'Équilibré']
export const ON_OFF = ['Désactivé', 'Activé']
