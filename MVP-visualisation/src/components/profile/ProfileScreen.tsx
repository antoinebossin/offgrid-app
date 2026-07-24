import { ArrowLeft, Cpu, ExternalLink, Leaf, Radio } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { CONFIG } from '../../config'
import { StatusBar } from '../StatusBar'
import { Card } from '../common/Card'

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value" style={{ fontSize: 13.5, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { state } = useApp()
  const connected = state === 'connected'

  return (
    <>
      <StatusBar />
      <div className="screen-scroll">
        <div className="dash-head">
          <button className="icon-btn" onClick={onBack} title="Retour au tableau de bord">
            <ArrowLeft size={18} />
          </button>
          <div className="brand-name" style={{ fontSize: 16 }}>Profil de l'installation</div>
          <span style={{ width: 38 }} />
        </div>

        <div className="brand" style={{ marginBottom: 16 }}>
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

        <span className={`pill ${connected ? 'pill-ok' : ''}`} style={{ marginBottom: 4 }}>
          <span className={`dot ${connected ? 'dot-pulse' : ''}`} /> {connected ? 'Connecté' : 'Hors ligne'}
        </span>

        <div className="section-label"><span className="bar" style={{ background: '#38bdf8' }} /> Automate</div>
        <Card icon={<Cpu size={16} />} color="#38bdf8">
          <div className="tile-grid">
            <InfoTile label="Modèle" value={CONFIG.plc.model} />
            <InfoTile label="Runtime" value={CONFIG.plc.runtime} />
            <InfoTile label="Modem" value={CONFIG.plc.modem} />
            <InfoTile label="Localisation" value={CONFIG.site.location} />
          </div>
        </Card>

        <div className="section-label"><span className="bar" style={{ background: '#34d399' }} /> Liaison</div>
        <Card icon={<Radio size={16} />} color="#34d399">
          <div className="tile-grid">
            <InfoTile label="Profil VPN" value={CONFIG.vpn.profile} />
            <InfoTile label="Endpoint" value={CONFIG.vpn.endpoint} />
            <InfoTile label="Protocole" value={CONFIG.vpn.protocol} />
            <InfoTile label="Chiffrement" value={CONFIG.vpn.cipher} />
          </div>
        </Card>

        <div className="section-label"><span className="bar" style={{ background: '#f59e0b' }} /> Accès direct</div>
        <Card icon={<ExternalLink size={16} />} color="#f59e0b">
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
            Adresse de la WebVisu CODESYS, une fois le tunnel actif :
          </div>
          <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{CONFIG.plc.dataUrl}</code>
        </Card>

        <div className="chip" style={{ marginTop: 6 }}>
          Démo · toutes les valeurs ci-dessus viennent de <code>src/config.ts</code>
        </div>
      </div>
    </>
  )
}
