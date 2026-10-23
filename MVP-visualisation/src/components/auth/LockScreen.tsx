import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Leaf, Lock, ShieldAlert } from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { useSettings } from '../../context/SettingsContext'
import {
  hasRecoveryCode,
  isCryptoAvailable,
  lockoutRemainingMs,
  markUnlocked,
  registerFailure,
  resetFailures,
  verifyPassword,
} from '../../services/auth/passwordGate'

function formatWait(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return min > 0 ? `${min} min ${String(sec).padStart(2, '0')} s` : `${sec} s`
}

/**
 * Ecran de deverrouillage affiche avant tout acces a l'application.
 * Voir services/auth/passwordGate.ts pour le modele de menace couvert.
 */
export function LockScreen({ onUnlock, onForgot }: { onUnlock: () => void; onForgot: () => void }) {
  const { settings } = useSettings()
  const auth = settings.auth

  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitMs, setWaitMs] = useState(() => lockoutRemainingMs())
  const inputRef = useRef<HTMLInputElement>(null)

  const cryptoOk = isCryptoAvailable()

  // Decompte de la temporisation apres trop d'essais rates.
  useEffect(() => {
    if (waitMs <= 0) return
    const id = window.setInterval(() => setWaitMs(lockoutRemainingMs()), 500)
    return () => window.clearInterval(id)
  }, [waitMs])

  useEffect(() => {
    if (cryptoOk && waitMs <= 0) inputRef.current?.focus()
  }, [cryptoOk, waitMs])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy || waitMs > 0 || !password) return
    setBusy(true)
    setError(null)
    try {
      if (await verifyPassword(auth, password)) {
        resetFailures()
        markUnlocked(auth)
        onUnlock()
        return
      }
      const fails = registerFailure(auth)
      const wait = lockoutRemainingMs()
      setWaitMs(wait)
      setPassword('')
      setError(
        wait > 0
          ? 'Trop de tentatives.'
          : `Mot de passe incorrect${fails > 1 ? ` (${fails} essais)` : ''}.`,
      )
    } catch {
      setError('Vérification impossible sur cet appareil.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <StatusBar />
      <div className="connect">
        <div className="brand">
          <span className="brand-mark">
            {settings.site.logoSrc ? (
              <img
                src={settings.site.logoSrc}
                alt={settings.site.name}
                width={34}
                height={34}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <Leaf size={22} color="#34d399" />
            )}
          </span>
          <div>
            <div className="brand-name">{settings.site.name}</div>
            <div className="brand-sub">{settings.site.tagline}</div>
          </div>
        </div>

        <div className="connect-hero">
          <span className="lock-badge">
            <Lock size={22} />
          </span>
          <div className="connect-title" style={{ marginTop: 14 }}>
            Accès protégé
          </div>
          <div className="connect-desc">
            {cryptoOk
              ? "Entrez le mot de passe de l'installation pour ouvrir le pilotage."
              : 'Cette page doit être servie en HTTPS pour vérifier le mot de passe.'}
          </div>

          {cryptoOk ? (
            <form className="lock-form" onSubmit={handleSubmit}>
              {/* Champ identifiant masque : sans lui, les gestionnaires de mots de
                  passe (Trousseau iOS, Google) ne proposent ni l'enregistrement
                  ni le remplissage automatique du mot de passe. */}
              <input
                type="text"
                name="username"
                value={settings.site.name}
                readOnly
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                className="lock-username"
              />

              <div className="lock-field">
                <input
                  ref={inputRef}
                  type={reveal ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  disabled={busy || waitMs > 0}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Mot de passe"
                />
                <button
                  type="button"
                  className="lock-reveal"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  tabIndex={-1}
                >
                  {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                className="lock-submit"
                type="submit"
                disabled={busy || waitMs > 0 || password.length === 0}
              >
                {busy ? 'Vérification…' : 'Déverrouiller'}
              </button>

              <div className="lock-msg" role="status" aria-live="polite">
                {waitMs > 0 ? (
                  <span className="lock-err">
                    <ShieldAlert size={13} /> Nouvel essai possible dans {formatWait(waitMs)}
                  </span>
                ) : error ? (
                  <span className="lock-err">
                    <ShieldAlert size={13} /> {error}
                  </span>
                ) : null}
              </div>

              {hasRecoveryCode(auth) ? (
                <button className="lock-link" type="button" onClick={onForgot}>
                  Mot de passe oublié ?
                </button>
              ) : null}
            </form>
          ) : (
            <div className="lock-msg" style={{ marginTop: 18 }}>
              <span className="lock-err">
                <ShieldAlert size={13} /> Contexte non sécurisé (HTTP)
              </span>
            </div>
          )}
        </div>

        <div className="chip" style={{ alignSelf: 'center', gap: 7 }}>
          <Lock size={12} />{' '}
          {auth.unlockMinutes > 0
            ? `Déverrouillage valable ${auth.unlockMinutes} min`
            : 'Mot de passe demandé à chaque ouverture'}
        </div>
      </div>
    </>
  )
}
