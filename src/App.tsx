import { AppProvider, useApp } from './context/AppContext'
import { PhoneFrame } from './components/PhoneFrame'
import { ConnectScreen } from './components/connect/ConnectScreen'
import { Dashboard } from './components/dashboard/Dashboard'

function Screen() {
  const { state } = useApp()
  return state === 'connected' ? <Dashboard /> : <ConnectScreen />
}

function DemoSidebar() {
  return (
    <aside className="sidebar">
      <h3>Off-the-Grid · Démo</h3>

      <div className="sb-card">
        <h4>De quoi s'agit-il ?</h4>
        <p>
          Maquette fonctionnelle de l'application de pilotage à distance de l'installation autonome
          de Montchauvel (projet de François). Un écran de connexion façon app mobile, puis un
          tableau de bord temps réel.
        </p>
      </div>

      <div className="sb-card">
        <h4>Chemin de la donnée</h4>
        <div className="flow-chain">
          <span><i className="n" /> Application (ce site / future app)</span>
          <span><i className="n" /> Tunnel <code>OpenVPN</code> sur 4G</span>
          <span><i className="n" /> Modem Quectel EC25 · SIM Orange</span>
          <span><i className="n" /> Automate WAGO 750-8217</span>
          <span><i className="n" /> Runtime CODESYS V3.5 (EMS)</span>
        </div>
      </div>

      <div className="sb-card">
        <h4>Brancher l'installation réelle</h4>
        <p>
          Toute la donnée passe par une seule interface : <code>PlcDataSource</code>. Il suffit de
          remplacer <code>MockPlcDataSource</code> par une implémentation réelle (WebVisu / Modbus
          TCP / fichier carte SD) — sans toucher à l'interface.
        </p>
      </div>

      <div className="sb-card">
        <h4>Note honnête</h4>
        <p>
          Dans cette démo web, le tunnel VPN est <b>simulé</b> (un navigateur ne peut pas lancer un
          VPN système). Dans la vraie app mobile, le bouton déclenchera le client OpenVPN puis
          chargera le tableau de bord. Le reste du code est, lui, bien réel.
        </p>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        <div className="app-bg" aria-hidden />
        <PhoneFrame>
          <Screen />
        </PhoneFrame>
        <DemoSidebar />
      </div>
    </AppProvider>
  )
}
