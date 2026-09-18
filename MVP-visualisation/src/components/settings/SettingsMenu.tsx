import { ChevronRight, Lock, ShieldCheck, Sliders } from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { ScreenHeader } from './ScreenHeader'
import { useSettings } from '../../context/SettingsContext'
import { hasPassword, isGateActive } from '../../services/auth/passwordGate'
import { isConfigured } from '../../services/settings/settingsStore'

export function SettingsMenu({
  onBack,
  onConfig,
  onSecurity,
  onLock,
}: {
  onBack: () => void
  onConfig: () => void
  onSecurity: () => void
  onLock: () => void
}) {
  const { settings } = useSettings()
  const configured = isConfigured(settings)
  const protege = isGateActive(settings.auth)

  return (
    <>
      <StatusBar />
      <div className="screen">
        <ScreenHeader title="Réglages" onBack={onBack} />

        <div className="menu-list">
          <button className="menu-row" type="button" onClick={onConfig}>
            <span className="menu-ico">
              <Sliders size={16} />
            </span>
            <span className="menu-txt">
              <span className="menu-label">Configuration</span>
              <span className="menu-sub">
                {configured ? settings.plc.dataUrl : 'Aucune installation configurée'}
              </span>
            </span>
            <ChevronRight size={16} className="muted" />
          </button>

          <button className="menu-row" type="button" onClick={onSecurity}>
            <span className="menu-ico">
              <ShieldCheck size={16} />
            </span>
            <span className="menu-txt">
              <span className="menu-label">Sécurité</span>
              <span className="menu-sub">
                {protege
                  ? `Protection active · ${settings.auth.unlockMinutes > 0 ? `${settings.auth.unlockMinutes} min` : 'à chaque ouverture'}`
                  : hasPassword(settings.auth)
                    ? 'Protection désactivée'
                    : 'Aucun mot de passe défini'}
              </span>
            </span>
            <ChevronRight size={16} className="muted" />
          </button>

          {protege ? (
            <button className="menu-row" type="button" onClick={onLock}>
              <span className="menu-ico">
                <Lock size={16} />
              </span>
              <span className="menu-txt">
                <span className="menu-label">Verrouiller maintenant</span>
                <span className="menu-sub">Redemander le mot de passe à la prochaine ouverture</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}
