export function Segmented({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[]
  value: number
  onChange: (i: number) => void
  disabled?: boolean
}) {
  return (
    <div className="segmented">
      {options.map((o, i) => (
        <button key={o} className={i === value ? 'active' : ''} onClick={() => !disabled && onChange(i)} disabled={disabled}>
          {o}
        </button>
      ))}
    </div>
  )
}
