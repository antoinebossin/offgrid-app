import type { MeasurementPoint } from '../../types/telemetry'
import { fmtNumber } from '../../utils/format'

export function MetricTile({ point, value }: { point: MeasurementPoint; value: number }) {
  let display: string
  let unit = point.unit
  if (point.enumLabels) {
    display = point.enumLabels[Math.round(value)] ?? '—'
    unit = ''
  } else {
    display = fmtNumber(value, point.decimals ?? 0)
  }
  return (
    <div className="tile">
      <div className="tile-label">{point.label}</div>
      <div className="tile-value">
        {display}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  )
}
