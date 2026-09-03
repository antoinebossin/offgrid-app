import { Leaf, ShieldCheck, Sliders, ExternalLink, Smartphone } from 'lucide-react'
import { CONFIG } from '../../config'
import { StatusBar } from '../StatusBar'

/**
 * Ecran reel (CONFIG.simulated = false) : pas de handshake VPN anime, pas de
 * tableau de bord simule. Un navigateur ne peut pas piloter le client OpenVPN
 * du telephone, donc on rappelle les deux gestes manuels puis on renvoie vers
 * la vraie WebVisu. C'est cet ecran qu'on ajoute a l'ecran d'accueil.
 */
export function RealHome() {
  return (
    <>
      <StatusBar />
      <div className="connect">
        <div className="brand">
          <span className="brand-mark">
            {CONFIG.site.logoSrc ? (
              <img src={CONFIG.site.logoSrc} alt={CONFIG.site.name} width={22} height={22} />
            ) : (
              <Leaf size={22} color="#34d399" />
            )}
          </span>
          <div>
            <div className="brand-name">{CONFIG.site.name}</div>
            <div className="brand-sub">{CONFIG.site.tagline}</div>
          </div>
        </div>

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
                <div className="step-detail">Se connecter au profil {CONFIG.vpn.profile}</div>
              </div>
            </div>
            <div className="step done">
              <span className="step-ico">
                <ShieldCheck size={13} />
              </span>
              <div className="step-txt">
                <div className="step-label">2. Vérifier le tunnel actif</div>
                <div className="step-detail">Icône VPN visible dans la barre d'état du téléphone</div>
              </div>
            </div>
          </div>

          <a
            className="pilotage-btn"
            href={CONFIG.plc.dataUrl}
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

        <div className="chip" style={{ alignSelf: 'center', gap: 7 }}>
          <ShieldCheck size={12} /> {CONFIG.plc.model} · {CONFIG.site.location}
        </div>
      </div>
    </>
  )
}
