import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Slider } from '../common/Slider'
import { Toggle } from '../common/Toggle'

function Todo() {
  return <span className="todo-badge">à définir</span>
}

export function PvControls({
  values,
  onToast,
}: {
  values: Record<string, number>
  onToast: (msg: string) => void
}) {
  const { dataSource } = useApp()
  const [pending, setPending] = useState<string | null>(null)
  const [split, setSplit] = useState<number | null>(null)
  const [tmax, setTmax] = useState<number | null>(null)
  const busy = pending !== null
  const num = (id: string) => values[id] ?? 0

  async function write(id: string, value: number, label: string) {
    setPending(id)
    await dataSource.writeParameter(id, value)
    setPending(null)
    onToast(`${label} · envoyé à l'automate`)
  }

  const splitVal = split ?? num('pv_split')
  const tmaxVal = tmax ?? num('temp_max_ballons')

  return (
    <>
      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Répartition PV <Todo /></span>
          <span className="ctrl-val">{Math.round(splitVal)}% ballons</span>
        </div>
        <Slider
          value={splitVal}
          min={0}
          max={100}
          step={5}
          onChange={setSplit}
          onCommit={(val) => write('pv_split', val, 'Répartition PV')}
          disabled={busy}
        />
        <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>
          {Math.round(splitVal)}% chauffage ballons · {100 - Math.round(splitVal)}% borne EV
        </div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Température max ballons <Todo /></span>
          <span className="ctrl-val">{Math.round(tmaxVal)} °C</span>
        </div>
        <Slider
          value={tmaxVal}
          min={40}
          max={80}
          step={1}
          onChange={setTmax}
          onCommit={(val) => write('temp_max_ballons', val, 'Température max ballons')}
          disabled={busy}
        />
        <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>Garde-fou : plage de sécurité 40–80 °C</div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Interrompre le chauffage élec.</span>
          <Toggle
            on={num('xStop_myPV_input') === 1}
            onChange={(b) => write('xStop_myPV_input', b ? 1 : 0, 'Interruption chauffage élec.')}
            disabled={busy}
          />
        </div>
        <div className="muted" style={{ fontSize: 10 }}>
          <code>xStop_myPV_input</code> — coupe l'alimentation myPV des deux ballons.
        </div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Chauffage élec. ballon gauche</span>
          <Toggle
            on={num('xRest_Ballon_Gauche') === 1}
            onChange={(b) => write('xRest_Ballon_Gauche', b ? 1 : 0, 'Chauffage ballon gauche')}
            disabled={busy}
          />
        </div>
        <div className="muted" style={{ fontSize: 10 }}><code>G_Parameters.xRest_Ballon_Gauche</code></div>
      </div>

      <div className="ctrl">
        <div className="ctrl-head">
          <span className="ctrl-name">Chauffage élec. ballon droit <Todo /></span>
          <Toggle
            on={num('xRest_Ballon_Droit') === 1}
            onChange={(b) => write('xRest_Ballon_Droit', b ? 1 : 0, 'Chauffage ballon droit')}
            disabled={busy}
          />
        </div>
        <div className="muted" style={{ fontSize: 10 }}><code>G_Parameters.xRest_Ballon_Droit</code> (à créer)</div>
      </div>
    </>
  )
}
