import type { HistoryPoint } from '../../types/telemetry'
import { fmtClock, fmtPower } from '../../utils/format'

// Graphe temps reel de la repartition de la puissance PV — SVG pur.
const W = 320
const H = 165
const PADL = 8
const PADR = 8
const PADT = 12
const PADB = 20

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: color }} />
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  )
}

export function PvChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) {
    return <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 12 }}>Acquisition…</div>
  }

  const n = history.length
  const plotW = W - PADL - PADR
  const plotH = H - PADT - PADB
  const yBottom = PADT + plotH
  const x = (i: number) => PADL + (i / (n - 1)) * plotW

  const charge = (h: HistoryPoint) => Math.max(0, h.battery)
  const maxW = Math.max(1000, ...history.map((h) => Math.max(h.pv, charge(h), h.ev, h.ballon))) * 1.12
  const y = (val: number) => yBottom - (val / maxW) * plotH

  const poly = (sel: (h: HistoryPoint) => number) =>
    history.map((h, i) => `${x(i).toFixed(1)},${y(sel(h)).toFixed(1)}`).join(' ')

  const pvPts = poly((h) => h.pv)
  const pvArea = `${PADL.toFixed(1)},${yBottom.toFixed(1)} ${pvPts} ${x(n - 1).toFixed(1)},${yBottom.toFixed(1)}`
  const last = history[n - 1]
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => PADT + plotH * (1 - f))

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <Legend color="#f59e0b" label="PV" value={pw(last.pv)} />
        <Legend color="#34d399" label="Batterie" value={pw(Math.max(0, last.battery))} />
        <Legend color="#fb923c" label="Ballons" value={pw(last.ballon)} />
        <Legend color="#38bdf8" label="EV" value={pw(last.ev)} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto' }}>
        <defs>
          <linearGradient id="pvfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((gy, i) => (
          <line key={i} x1={PADL} y1={gy} x2={W - PADR} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        <polygon points={pvArea} fill="url(#pvfill)" />
        <polyline points={pvPts} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={poly(charge)} fill="none" stroke="#34d399" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={poly((h) => h.ballon)} fill="none" stroke="#fb923c" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={poly((h) => h.ev)} fill="none" stroke="#38bdf8" strokeWidth={1.8} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />
        <text x={PADL} y={H - 6} fontSize="9" fill="#6f7c93">{fmtClock(history[0].t)}</text>
        <text x={W - PADR} y={H - 6} fontSize="9" fill="#6f7c93" textAnchor="end">{fmtClock(last.t)}</text>
      </svg>
    </div>
  )
}

function pw(w: number): string {
  const f = fmtPower(w)
  return `${f.value} ${f.unit}`
}
