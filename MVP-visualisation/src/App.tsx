import { useEffect, useState, type ReactNode } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { PhoneFrame } from './components/PhoneFrame'
import { ConnectScreen } from './components/connect/ConnectScreen'
import { Dashboard } from './components/dashboard/Dashboard'
import { ProfileScreen } from './components/profile/ProfileScreen'
import { RealApp } from './components/home/RealApp'
import { LockScreen } from './components/auth/LockScreen'
import { RecoveryScreen } from './components/auth/RecoveryScreen'
import { isGateActive, isUnlocked, lock, markUnlocked } from './services/auth/passwordGate'
import { CONFIG } from './config'

/** Coquille visuelle commune : fond degrade + cadre telephone. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden />
      <PhoneFrame>{children}</PhoneFrame>
    </div>
  )
}

/**
 * Verrou d'acces (Delivrable B). Tant que le mot de passe n'a pas ete saisi,
 * rien d'autre que l'ecran de deverrouillage n'est monte.
 *
 * Deux garde-fous importants :
 *  - tant qu'aucun mot de passe n'est defini, il n'y a pas de verrou du tout —
 *    une app fraichement installee ne bloque jamais son nouvel utilisateur ;
 *  - le deverrouillage vaut un delai d'INACTIVITE : tant que la page est au
 *    premier plan, l'echeance est repoussee ; des que l'app passe en
 *    arriere-plan, le compte a rebours court.
 */
function Gate({ children }: { children: (lockNow: () => void) => ReactNode }) {
  const { settings } = useSettings()
  const auth = settings.auth
  const [unlocked, setUnlocked] = useState(() => isUnlocked(auth))
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!isGateActive(auth)) {
      setUnlocked(true)
      return
    }
    if (!unlocked) return
    const tick = () => {
      if (!isUnlocked(auth)) {
        setUnlocked(false)
      } else if (document.visibilityState === 'visible') {
        markUnlocked(auth)
      }
    }
    const id = window.setInterval(tick, 15_000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [auth, unlocked])

  if (!unlocked) {
    if (recovering) {
      return (
        <Shell>
          <RecoveryScreen
            onBack={() => setRecovering(false)}
            onDone={() => {
              setRecovering(false)
              setUnlocked(true)
            }}
          />
        </Shell>
      )
    }
    return (
      <Shell>
        <LockScreen onUnlock={() => setUnlocked(true)} onForgot={() => setRecovering(true)} />
      </Shell>
    )
  }

  return (
    <>
      {children(() => {
        lock()
        setUnlocked(false)
      })}
    </>
  )
}

function Screen() {
  const { state } = useApp()
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard')

  // Revient au tableau de bord si on se deconnecte pendant qu'on est sur le profil.
  useEffect(() => {
    if (state !== 'connected') setView('dashboard')
  }, [state])

  if (state !== 'connected') return <ConnectScreen />
  return view === 'profile' ? (
    <ProfileScreen onBack={() => setView('dashboard')} />
  ) : (
    <Dashboard onOpenProfile={() => setView('profile')} />
  )
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
  // App reelle (celle qu'on ajoute a l'ecran d'accueil) : pas de handshake VPN
  // anime ni de tableau de bord simule, juste le rappel des deux gestes manuels
  // et le bouton Pilotage vers la vraie WebVisu.
  if (!CONFIG.simulated) {
    return (
      <SettingsProvider>
        <Gate>
          {(lockNow) => (
            <Shell>
              <RealApp onLock={lockNow} />
            </Shell>
          )}
        </Gate>
      </SettingsProvider>
    )
  }

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
