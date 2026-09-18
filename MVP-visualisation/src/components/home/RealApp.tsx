import { useState } from 'react'
import { RealHome } from './RealHome'
import { SettingsMenu } from '../settings/SettingsMenu'
import { ConfigScreen } from '../settings/ConfigScreen'
import { SecurityScreen } from '../settings/SecurityScreen'

type View = 'home' | 'menu' | 'config' | 'security'

/** Navigation de l'app reelle : accueil, reglages, configuration, securite. */
export function RealApp({ onLock }: { onLock: () => void }) {
  const [view, setView] = useState<View>('home')

  switch (view) {
    case 'menu':
      return (
        <SettingsMenu
          onBack={() => setView('home')}
          onConfig={() => setView('config')}
          onSecurity={() => setView('security')}
          onLock={onLock}
        />
      )
    case 'config':
      return <ConfigScreen onBack={() => setView('home')} />
    case 'security':
      return <SecurityScreen onBack={() => setView('home')} />
    default:
      return (
        <RealHome
          onOpenSettings={() => setView('menu')}
          onConfigure={() => setView('config')}
          onSecurity={() => setView('security')}
        />
      )
  }
}
