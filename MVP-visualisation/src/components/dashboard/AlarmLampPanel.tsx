import { ALARM_LAMPS, type AlarmLampDef } from '../../data/measurementPoints'
import { LED_COLORS, fmtNumber } from '../../utils/format'
import type { LedLevel } from '../../types/telemetry'

function levelOf(values: Record<string, number>, def: AlarmLampDef): LedLevel | null {
  if (values[def.red] === 1) return 'red'
  if (values[def.amber] === 1) return 'amber'
  if (values[def.green] === 1) return 'green'
  return null
}

// Feu tricolore : rouge en haut, jaune au milieu, vert en bas.
const ORDER: LedLevel[] = ['red', 'amber', 'green']

function Lamp({ active }: { active: LedLevel | null }) {
  return (
    <div className="lamp">
      {ORDER.map((lvl) => {
        const on = active === lvl
        const color = LED_COLORS[lvl]
        return (
          <span
            key={lvl}
            className={`led ${on ? 'on' : ''}`}
            style={on ? { background: color, boxShadow: `0 0 10px ${color}, 0 0 3px ${color}` } : undefined}
          />
        )
      })}
    </div>
  )
}

export function AlarmLampPanel({ values }: { values: Record<string, number> }) {
  return (
    <div className="lamp-panel">
      {ALARM_LAMPS.map((def) => {
        const active = levelOf(values, def)
        const raw = def.valueId ? values[def.valueId] ?? 0 : null
        const value = raw !== null ? fmtNumber(raw, def.decimals ?? 0) : null
        return (
          <div className="lamp-row" key={def.key}>
            <Lamp active={active} />
            <div className="lamp-info">
              <div className="lamp-label">{def.label}</div>
              {value !== null && (
                <div className="lamp-value">
                  {value}
                  {def.unit && <small>{def.unit}</small>}
                </div>
              )}
              <div className="lamp-th">{def.thresholds}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
