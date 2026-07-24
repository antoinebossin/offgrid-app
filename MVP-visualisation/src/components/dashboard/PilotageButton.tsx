import { ExternalLink, Sliders } from 'lucide-react'
import { CONFIG } from '../../config'

/**
 * Navigation de premier niveau vers la WebVisu CODESYS servie par l'automate.
 * Volontairement PAS une iframe : le HTTPS de ce shell bloquerait le contenu
 * HTTP de la WebVisu (mixed content). Ouvre dans un nouvel onglet pour ne
 * pas perdre l'etat de la demo (utile aussi en PWA plein-ecran, sans barre
 * d'adresse pour revenir en arriere).
 */
export function PilotageButton() {
  return (
    <a
      className="pilotage-btn"
      href={CONFIG.plc.dataUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="pilotage-ico">
        <Sliders size={18} />
      </span>
      <span className="pilotage-txt">
        <span className="pilotage-title">Pilotage</span>
        <span className="pilotage-sub">Ouvrir la WebVisu de l'automate</span>
      </span>
      <ExternalLink size={16} className="muted" />
    </a>
  )
}
