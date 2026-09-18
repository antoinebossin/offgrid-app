import { ChevronLeft } from 'lucide-react'

/** En-tete commun aux ecrans secondaires : retour + titre. */
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="screen-header">
      <button className="screen-back" type="button" onClick={onBack} aria-label="Retour">
        <ChevronLeft size={18} />
      </button>
      <div className="screen-title">{title}</div>
    </div>
  )
}
