import { Leaf, Power, ShieldCheck, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { CONFIG } from '../../config'
import { StatusBar } from '../StatusBar'
import { ConnectionSteps } from './ConnectionSteps'

export function ConnectScreen() {
  const { state, steps, connect } = useApp()
  const connecting = state === 'connecting'

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
          {!connecting && (
            <>
              <div className="eyebrow">Installation autonome</div>
              <div className="connect-title">
                Reprenez la main,
                <br />
                où que vous soyez
              </div>
              <div className="connect-desc">
                Connexion sécurisée à l'automate via tunnel OpenVPN, sur la liaison 4G de l'installation.
              </div>
            </>
          )}

          <button
            className={`connect-btn ${connecting ? 'is-connecting' : ''}`}
            onClick={() => !connecting && connect()}
            disabled={connecting}
          >
            <span className="ring" />
            <span className="connect-btn-inner">
              <Power size={34} color={connecting ? '#38bdf8' : '#34d399'} />
              <span className="connect-btn-label">{connecting ? 'Connexion…' : 'Se connecter'}</span>
              <span className="connect-btn-sub">{connecting ? 'Tunnel en cours' : 'Tunnel OpenVPN'}</span>
            </span>
          </button>

          {connecting ? (
            <ConnectionSteps steps={steps} />
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="chip">{CONFIG.plc.model}</span>
              <span className="chip">{CONFIG.plc.runtime}</span>
              <span className="chip">
                <ShieldCheck size={12} /> OpenVPN
              </span>
            </div>
          )}
        </div>

        {!connecting && (
          <div className="chip" style={{ alignSelf: 'center', gap: 7 }}>
            <Info size={12} /> Démo · données simulées
          </div>
        )}
      </div>
    </>
  )
}
