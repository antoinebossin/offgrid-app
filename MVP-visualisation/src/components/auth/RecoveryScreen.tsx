import { useState, type FormEvent } from 'react'
import { Copy, KeyRound, TriangleAlert } from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { ScreenHeader } from '../settings/ScreenHeader'
import { useSettings } from '../../context/SettingsContext'
import {
  formatRecoveryCode,
  hasRecoveryCode,
  markUnlocked,
  resetFailures,
  verifyRecoveryCode,
  withNewPassword,
  withNewRecoveryCode,
} from '../../services/auth/passwordGate'

const MIN_LENGTH = 6

/**
 * Recuperation d'acces apres oubli du mot de passe.
 *
 * L'utilisateur saisit le code de secours note a la mise en service (et
 * conserve par l'installateur), puis choisit un nouveau mot de passe. Le code
 * utilise est immediatement remplace : il vient d'etre dicte ou relu, donc il
 * est considere comme compromis. Le nouveau code est affiche une seule fois.
 */
export function RecoveryScreen({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { settings, updateAuth } = useSettings()
  const auth = settings.auth

  const [step, setStep] = useState<'code' | 'password' | 'newcode'>('code')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [freshCode, setFreshCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitCode(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (await verifyRecoveryCode(auth, code)) {
        setStep('password')
      } else {
        setError('Code de secours incorrect.')
      }
    } catch {
      setError('Vérification impossible sur cet appareil.')
    } finally {
      setBusy(false)
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (password.length < MIN_LENGTH) {
      setError(`${MIN_LENGTH} caractères minimum.`)
      return
    }
    if (password !== confirm) {
      setError('Les deux saisies diffèrent.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const withPassword = await withNewPassword(auth, password)
      const generated = await withNewRecoveryCode(withPassword)
      updateAuth(generated.auth)
      resetFailures()
      markUnlocked(generated.auth)
      setFreshCode(generated.code)
      setStep('newcode')
    } catch {
      setError('Opération impossible sur cet appareil.')
    } finally {
      setBusy(false)
    }
  }

  if (!hasRecoveryCode(auth)) {
    return (
      <>
        <StatusBar />
        <div className="screen">
          <ScreenHeader title="Mot de passe oublié" onBack={onBack} />
          <div className="screen-body">
            <div className="form-msg form-err">
              <TriangleAlert size={13} /> Aucun code de secours n'est enregistré sur cet appareil.
            </div>
            <p className="screen-intro">
              L'accès ne peut pas être rétabli depuis l'application. Contactez l'installateur : la
              procédure consiste à réinstaller l'application, ce qui efface la configuration locale
              et permet de tout redéfinir.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (step === 'newcode') {
    return (
      <>
        <StatusBar />
        <div className="screen">
          <ScreenHeader title="Nouveau code de secours" onBack={onDone} />
          <div className="screen-body">
            <div className="code-panel">
              <KeyRound size={20} className="muted" />
              <div className="code-value">{formatRecoveryCode(freshCode)}</div>
            </div>
            <p className="screen-intro" style={{ marginTop: 16 }}>
              Le code précédent ne fonctionne plus. Notez celui-ci et transmettez-le à
              l'installateur pour qu'il mette à jour le dossier de l'installation.
            </p>
            <button
              className="form-secondary"
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(formatRecoveryCode(freshCode)).catch(() => {})
              }}
            >
              <Copy size={13} /> Copier le code
            </button>
            <button className="form-submit" type="button" onClick={onDone}>
              J'ai noté le code
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <StatusBar />
      <div className="screen">
        <ScreenHeader title="Mot de passe oublié" onBack={onBack} />
        {step === 'code' ? (
          <form className="screen-body" onSubmit={submitCode}>
            <p className="screen-intro">
              Saisissez le code de secours remis à la mise en service. L'installateur en conserve
              une copie dans le dossier de l'installation.
            </p>
            <label className="form-label" htmlFor="rec-code">
              Code de secours
            </label>
            <div className="form-field">
              <input
                id="rec-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError(null)
                }}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="mono"
              />
            </div>
            <p className="form-hint">Les tirets, espaces et minuscules sont sans importance.</p>
            {error ? (
              <div className="form-msg form-err">
                <TriangleAlert size={13} /> {error}
              </div>
            ) : null}
            <button className="form-submit" type="submit" disabled={busy || code.length === 0}>
              {busy ? 'Vérification…' : 'Valider'}
            </button>
          </form>
        ) : (
          <form className="screen-body" onSubmit={submitPassword}>
            <p className="screen-intro">Code accepté. Choisissez un nouveau mot de passe.</p>
            <label className="form-label" htmlFor="rec-new">
              Nouveau mot de passe
            </label>
            <div className="form-field">
              <input
                id="rec-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
              />
            </div>
            <label className="form-label" htmlFor="rec-confirm">
              Confirmer
            </label>
            <div className="form-field">
              <input
                id="rec-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setError(null)
                }}
              />
            </div>
            <p className="form-hint">{MIN_LENGTH} caractères minimum.</p>
            {error ? (
              <div className="form-msg form-err">
                <TriangleAlert size={13} /> {error}
              </div>
            ) : null}
            <button className="form-submit" type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
