import {
  ExternalLink,
  Leaf,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
} from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { useSettings } from '../../context/SettingsContext'
import { isGateActive } from '../../services/auth/passwordGate'
import { isConfigured } from '../../services/settings/settingsStore'

/**
 * Ecran reel (mode production) : pas de handshake VPN anime, pas de tableau de
 * bord simule. Un navigateur ne peut pas piloter le client OpenVPN du
 * telephone, donc on rappelle les deux gestes manuels puis on renvoie vers la
 * vraie WebVisu. C'est cet ecran qu'on ajoute a l'ecran d'accueil.
 */
export function RealHome({
  onOpenSettings,
  onConfigure,
  onSecurity,
}: {
  onOpenSettings: () => void
  onConfigure: () => void
  onSecurity: () => void
}) {
  const { settings } = useSettings()
  const configured = isConfigured(settings)
  const protege = isGateActive(settings.auth)

  return (
    <>
      <StatusBar />
      <div className="connect">
        <div className="brand">
          <span className="brand-mark">
            {settings.site.logoSrc ? (
              <img src={settings.site.logoSrc} alt={settings.site.name} width={22} height={22} />
            ) : (
              <Leaf size={22} color="#34d399" />
            )}
          </span>
          <div style={{ flex: 1 }}>
            <div className="brand-name">{settings.site.name}</div>
            <div className="brand-sub">{settings.site.tagline}</div>
          </div>
          <button
            className="icon-btn"
            type="button"
            onClick={onOpenSettings}
            aria-label="Réglages"
          >
            <Settings size={17} />
          </button>
        </div>

        {/* Premier demarrage : l'app ne bloque jamais, elle propose de se configurer. */}
        {!protege ? (
          <button className="banner" type="button" onClick={onSecurity}>
            <ShieldAlert size={15} />
            <span>
              <b>Accès non protégé</b> — définir un mot de passe
            </span>
          </button>
        ) : null}

        {configured ? (
          <div className="connect-hero">
            <div className="eyebrow">Installation autonome</div>
            <div className="connect-title">
              Reprenez la main,
              <br />
              où que vous soyez
            </div>
            <div className="connect-desc">
              L'accès passe par le tunnel OpenVPN de l'installation. Connectez-vous d'abord, puis
              ouvrez le pilotage.
            </div>

            <div className="steps" style={{ marginTop: 20, marginBottom: 4 }}>
              <div className="step done">
                <span className="step-ico">
                  <Smartphone size={13} />
                </span>
                <div className="step-txt">
                  <div className="step-label">1. Ouvrir OpenVPN Connect</div>
                  <div className="step-detail">
                    {settings.vpn.profile
                      ? `Se connecter au profil ${settings.vpn.profile}`
                      : 'Se connecter au profil de l’installation'}
                  </div>
                </div>
              </div>
              <div className="step done">
                <span className="step-ico">
                  <ShieldCheck size={13} />
                </span>
                <div className="step-txt">
                  <div className="step-label">2. Vérifier le tunnel actif</div>
                  <div className="step-detail">
                    Icône VPN visible dans la barre d'état du téléphone
                  </div>
                </div>
              </div>
            </div>

            <a
              className="pilotage-btn"
              href={settings.plc.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%', marginTop: 14 }}
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
          </div>
        ) : (
          <div className="connect-hero">
            <span className="lock-badge">
              <Settings size={22} />
            </span>
            <div className="connect-title" style={{ marginTop: 14 }}>
              Installation
              <br />
              non configurée
            </div>
            <div className="connect-desc">
              Indiquez l'adresse de la WebVisu de l'automate pour commencer. L'installateur vous la
              fournit avec le profil OpenVPN.
            </div>
            <button
              className="form-submit"
              type="button"
              onClick={onConfigure}
              style={{ maxWidth: 270, marginTop: 22 }}
            >
              Configurer l'installation
            </button>
          </div>
        )}

        <div className="home-footer">
          <div className="chip" style={{ gap: 7 }}>
            <ShieldCheck size={12} />{' '}
            {[settings.plc.model, settings.site.location].filter(Boolean).join(' · ') ||
              'Aucune installation'}
          </div>
        </div>
      </div>
    </>
  )
}
