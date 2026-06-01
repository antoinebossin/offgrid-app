import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Segmented } from '../common/Segmented'
import { Slider } from '../common/Slider'
import { Toggle } from '../common/Toggle'
import { CHARGE_PRIORITIES, EMS_MODES } from '../../utils/format'

export function ParameterControls({
  values,
  onToast,
}: {
  values: Record<string, number>
  onToast: (msg: string) => void
}) {
  const { dataSource } = useApp()
  const [pending, setPending] = useState<string | null>(null)
  const [hw, setHw] = useState<number | null>(null)
  const [socMin, setSocMin] = useState<number | null>(null)

  const num = (id: string) => values[id] ?? 0
  const busy = pending !== null

  async function write(id: string, value: number, label: string) {
    setPending(id)
    await dataSource.writeParameter(id, value)
    setPending(null)
    onToast(`${label} · envoyé à l'automate`)
  }

  const hwVal = hw ?? num('ems_hotwater_setpoint')
  const socVal = socMin ?? num('ems_soc_min')

  return (
    <>
      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Mode EMS</span>
          <span className="ctrl-val">{EMS_MODES[num('ems_mode')]}</span>
        </div>
        <Segmented options={EMS_MODES} value={num('ems_mode')} onChange={(i) => write('ems_mode', i, 'Mode EMS')} disabled={busy} />
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Consigne eau chaude</span>
          <span className="ctrl-val">{Math.round(hwVal)} °C</span>
        </div>
        <Slider
          value={hwVal}
          min={40}
          max={65}
          step={1}
          onChange={setHw}
          onCommit={(val) => write('ems_hotwater_setpoint', val, 'Consigne eau chaude')}
          disabled={busy}
        />
        <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>Garde-fou : plage de sécurité 40–65 °C</div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Réserve batterie minimale</span>
          <span className="ctrl-val">{Math.round(socVal)} %</span>
        </div>
        <Slider
          value={socVal}
          min={10}
          max={50}
          step={5}
          onChange={setSocMin}
          onCommit={(val) => write('ems_soc_min', val, 'Réserve batterie')}
          disabled={busy}
        />
        <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>Seuil de délestage / appoint · plage 10–50 %</div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Priorité de charge</span>
          <span className="ctrl-val">{CHARGE_PRIORITIES[num('ems_charge_priority')]}</span>
        </div>
        <Segmented
          options={CHARGE_PRIORITIES}
          value={num('ems_charge_priority')}
          onChange={(i) => write('ems_charge_priority', i, 'Priorité de charge')}
          disabled={busy}
        />
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Délestage automatique</span>
          <Toggle on={num('ems_load_shedding') === 1} onChange={(b) => write('ems_load_shedding', b ? 1 : 0, 'Délestage auto')} disabled={busy} />
        </div>
        <div className="muted" style={{ fontSize: 10 }}>Coupe les circuits non prioritaires sous le seuil de réserve.</div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Appoint électrique</span>
          <Toggle on={num('ems_backup_heater') === 1} onChange={(b) => write('ems_backup_heater', b ? 1 : 0, 'Appoint électrique')} disabled={busy} />
        </div>
        <div className="muted" style={{ fontSize: 10 }}>Autorise la résistance d'appoint si le solaire est insuffisant.</div>
      </div>
    </>
  )
}
