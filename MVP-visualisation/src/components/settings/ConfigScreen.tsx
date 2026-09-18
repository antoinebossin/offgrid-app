import { useState, type FormEvent } from 'react'
import { Check, RotateCcw, TriangleAlert } from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { ScreenHeader } from './ScreenHeader'
import { factorySettings, useSettings } from '../../context/SettingsContext'
import { FACTORY_PRESET } from '../../config'
import type { Settings } from '../../types/settings'

/** Copie profonde — structuredClone n'existe pas sur les iOS anterieurs a 15.4. */
function clone(value: Settings): Settings {
  return JSON.parse(JSON.stringify(value)) as Settings
}

/** Une URL de WebVisu doit etre absolue : l'app l'ouvre telle quelle. */
function validateUrl(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return "L'adresse de la WebVisu est obligatoire."
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return 'Adresse invalide — elle doit commencer par https:// ou http://.'
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Seules les adresses https:// et http:// sont acceptées.'
  }
  return null
}

export function ConfigScreen({ onBack }: { onBack: () => void }) {
  const { settings, update, reset } = useSettings()
  const [draft, setDraft] = useState<Settings>(() => clone(settings))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function field<K extends keyof Settings>(section: K, key: keyof Settings[K], value: string) {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }))
    setError(null)
    setSaved(false)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const urlError = validateUrl(draft.plc.dataUrl)
    if (urlError) {
      setError(urlError)
      return
    }
    // Le mot de passe et le code de secours ne sont pas modifiables ici :
    // on repart des reglages courants pour ne rien ecraser par inadvertance.
    update({ ...draft, plc: { ...draft.plc, dataUrl: draft.plc.dataUrl.trim() }, auth: settings.auth })
    setSaved(true)
  }

  function handleReset() {
    reset()
    setDraft(clone(factorySettings()))
    setError(null)
    setSaved(true)
  }

  return (
    <>
      <StatusBar />
      <div className="screen">
        <ScreenHeader title="Configuration" onBack={onBack} />

        {/* noValidate : la validation native du navigateur afficherait une bulle
              dans la langue du systeme et empecherait nos propres messages. */}
        <form className="screen-body" onSubmit={handleSubmit} noValidate>
          <p className="screen-intro">
            Ces réglages décrivent l'installation pilotée par cette application. Les modifier ici
            suffit à la faire pointer vers une autre installation — sans rien recompiler.
          </p>

          <label className="form-label" htmlFor="cfg-url">
            Adresse de la WebVisu
          </label>
          <div className="form-field">
            <input
              id="cfg-url"
              type="url"
              inputMode="url"
              value={draft.plc.dataUrl}
              onChange={(e) => field('plc', 'dataUrl', e.target.value)}
              placeholder="https://10.0.0.1/webvisu/webvisu.htm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <p className="form-hint">
            Adresse servie par l'automate, joignable une fois le tunnel OpenVPN établi. C'est elle
            qu'ouvre le bouton Pilotage.
          </p>

          <label className="form-label" htmlFor="cfg-name">
            Nom du site
          </label>
          <div className="form-field">
            <input
              id="cfg-name"
              type="text"
              value={draft.site.name}
              onChange={(e) => field('site', 'name', e.target.value)}
              placeholder="Nom de l'installation"
            />
          </div>

          <label className="form-label" htmlFor="cfg-tagline">
            Sous-titre
          </label>
          <div className="form-field">
            <input
              id="cfg-tagline"
              type="text"
              value={draft.site.tagline}
              onChange={(e) => field('site', 'tagline', e.target.value)}
              placeholder="Commune · Pilotage à distance"
            />
          </div>

          <label className="form-label" htmlFor="cfg-location">
            Localisation
          </label>
          <div className="form-field">
            <input
              id="cfg-location"
              type="text"
              value={draft.site.location}
              onChange={(e) => field('site', 'location', e.target.value)}
              placeholder="Commune"
            />
          </div>

          <label className="form-label" htmlFor="cfg-vpn">
            Profil OpenVPN
          </label>
          <div className="form-field">
            <input
              id="cfg-vpn"
              type="text"
              value={draft.vpn.profile}
              onChange={(e) => field('vpn', 'profile', e.target.value)}
              placeholder="installation.ovpn"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <p className="form-hint">
            Rappel affiché à l'écran. Le tunnel lui-même est établi par l'application OpenVPN
            Connect, en dehors de celle-ci.
          </p>

          <label className="form-label" htmlFor="cfg-model">
            Modèle de l'automate
          </label>
          <div className="form-field">
            <input
              id="cfg-model"
              type="text"
              value={draft.plc.model}
              onChange={(e) => field('plc', 'model', e.target.value)}
              placeholder="WAGO 750-8217"
            />
          </div>

          {error ? (
            <div className="form-msg form-err">
              <TriangleAlert size={13} /> {error}
            </div>
          ) : saved ? (
            <div className="form-msg form-ok">
              <Check size={13} /> Configuration enregistrée.
            </div>
          ) : null}

          <button className="form-submit" type="submit">
            Enregistrer
          </button>

          {FACTORY_PRESET ? (
            <button className="form-secondary" type="button" onClick={handleReset}>
              <RotateCcw size={13} /> Revenir aux valeurs d'origine
            </button>
          ) : null}
        </form>
      </div>
    </>
  )
}
