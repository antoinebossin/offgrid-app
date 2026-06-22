import type { HistoryPoint } from '../../types/telemetry'
import { fmtClock, fmtPower } from '../../utils/format'

// Graphe temps réel en SVG pur — aucune dépendance externe.
const W = 320
const H = 160
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

export function LiveChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 12 }}>
        Acquisition…
      </div>
    )
  }

  const n = history.length
  const plotW = W - PADL - PADR
  const plotH = H - PADT - PADB
  const yBottom = PADT + plotH
  const x = (i: number) => PADL + (i / (n - 1)) * plotW

  const maxW = Math.max(1000, ...history.map((h) => Math.max(h.pv, h.load))) * 1.12
  const yW = (v: number) => yBottom - (v / maxW) * plotH
  const ySoc = (v: number) => yBottom - (v / 100) * plotH

  const poly = (sel: (h: HistoryPoint) => number, y: (v: number) => number) =>
    history.map((h, i) => `${x(i).toFixed(1)},${y(sel(h)).toFixed(1)}`).join(' ')

  const pvPts = poly((h) => h.pv, yW)
  const loadPts = poly((h) => h.load, yW)
  const socPts = poly((h) => h.soc, ySoc)
  const pvArea = `${PADL.toFixed(1)},${yBottom.toFixed(1)} ${pvPts} ${x(n - 1).toFixed(1)},${yBottom.toFixed(1)}`

  const last = history[n - 1]
  const pvP = fmtPower(last.pv)
  const loadP = fmtPower(last.load)
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => PADT + plotH * (1 - f))

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
        <Legend color="#f59e0b" label="PV" value={`${pvP.value} ${pvP.unit}`} />
        <Legend color="#a78bfa" label="Conso" value={`${loadP.value} ${loadP.unit}`} />
        <Legend color="#34d399" label="SoC" value={`${Math.round(last.soc)} %`} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto' }}>
        <defs>
          <linearGradient id="pvfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((gy, i) => (
          <line key={i} x1={PADL} y1={gy} x2={W - PADR} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        <polygon points={pvArea} fill="url(#pvfill)" />
        <polyline points={pvPts} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={loadPts} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={socPts} fill="none" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />
        <text x={PADL} y={H - 6} fontSize="9" fill="#6f7c93">{fmtClock(history[0].t)}</text>
        <text x={W - PADR} y={H - 6} fontSize="9" fill="#6f7c93" textAnchor="end">{fmtClock(last.t)}</text>
      </svg>
    </div>
  )
}
