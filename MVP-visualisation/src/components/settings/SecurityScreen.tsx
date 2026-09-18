import { useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound, ShieldAlert, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react'
import { StatusBar } from '../StatusBar'
import { ScreenHeader } from './ScreenHeader'
import { useSettings } from '../../context/SettingsContext'
import {
  formatRecoveryCode,
  hasPassword,
  hasRecoveryCode,
  isCryptoAvailable,
  isGateActive,
  lock,
  verifyPassword,
  withNewPassword,
  withNewRecoveryCode,
  withoutPassword,
} from '../../services/auth/passwordGate'

const MIN_LENGTH = 6
type Action = null | 'define' | 'change' | 'disable' | 'regenerate'

/**
 * Ecran Securite : definir, changer ou retirer le mot de passe, regenerer le
 * code de secours, choisir le delai de reverrouillage.
 *
 * Toute operation sensible (changer, desactiver, regenerer) exige le mot de
 * passe courant — sinon le verrou ne vaudrait rien : il suffirait d'ouvrir
 * l'app pour le retirer.
 */
export function SecurityScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateAuth } = useSettings()
  const auth = settings.auth
  const defined = hasPassword(auth)
  const active = isGateActive(auth)

  const [action, setAction] = useState<Action>(defined ? null : 'define')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** Code de secours affiche une seule fois, juste apres sa generation. */
  const [freshCode, setFreshCode] = useState<string | null>(null)

  const cryptoOk = isCryptoAvailable()

  function resetForm(nextAction: Action) {
    setAction(nextAction)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
    setNotice(null)
  }

  async function requireCurrent(): Promise<boolean> {
    if (!defined) return true
    if (await verifyPassword(auth, current)) return true
    setError('Mot de passe actuel incorrect.')
    return false
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (action === 'define' || action === 'change') {
        if (next.length < MIN_LENGTH) {
          setError(`${MIN_LENGTH} caractères minimum.`)
          return
        }
        if (next !== confirm) {
          setError('Les deux saisies diffèrent.')
          return
        }
        if (!(await requireCurrent())) return

        let updated = await withNewPassword(auth, next)
        // Premiere definition : on fournit aussi un code de secours. Un simple
        // changement de mot de passe ne touche pas au code deja note.
        if (!hasRecoveryCode(auth)) {
          const generated = await withNewRecoveryCode(updated)
          updated = generated.auth
          setFreshCode(generated.code)
        } else {
          setNotice('Mot de passe modifié. Le code de secours reste inchangé.')
        }
        updateAuth(updated)
        lock()
        resetForm(null)
        return
      }

      if (action === 'regenerate') {
        if (!(await requireCurrent())) return
        const generated = await withNewRecoveryCode(auth)
        updateAuth(generated.auth)
        setFreshCode(generated.code)
        resetForm(null)
        return
      }

      if (action === 'disable') {
        if (!(await requireCurrent())) return
        updateAuth(withoutPassword(auth))
        lock()
        resetForm(null)
        setNotice("Protection retirée. L'application s'ouvre désormais sans mot de passe.")
        return
      }
    } catch {
      setError('Opération impossible sur cet appareil.')
    } finally {
      setBusy(false)
    }
  }

  function setDelay(minutes: number) {
    updateAuth({ ...auth, unlockMinutes: minutes })
  }

  // --- Code de secours fraichement genere : ecran dedie, affiche une fois ----
  if (freshCode) {
    return (
      <>
        <StatusBar />
        <div className="screen">
          <ScreenHeader title="Code de secours" onBack={() => setFreshCode(null)} />
          <div className="screen-body">
            <div className="code-panel">
              <KeyRound size={20} className="muted" />
              <div className="code-value">{formatRecoveryCode(freshCode)}</div>
            </div>
            <p className="screen-intro" style={{ marginTop: 16 }}>
              Notez ce code maintenant et transmettez-le à l'installateur, qui le conserve dans le
              dossier de l'installation. C'est le seul moyen de retrouver l'accès si le mot de
              passe est oublié.
            </p>
            <p className="form-hint">
              Il ne sera plus jamais affiché : seule son empreinte est conservée sur l'appareil. En
              cas de perte, il faudra en générer un nouveau depuis cet écran, avec le mot de passe.
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
            <button className="form-submit" type="button" onClick={() => setFreshCode(null)}>
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
        <ScreenHeader title="Sécurité" onBack={onBack} />

        <div className="screen-body">
          <div className={`status-card ${active ? 'ok' : 'warn'}`}>
            {active ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <div>
              <div className="status-title">
                {active ? 'Accès protégé' : 'Accès non protégé'}
              </div>
              <div className="status-sub">
                {active
                  ? 'Un mot de passe est demandé à l’ouverture de l’application.'
                  : "N'importe qui ouvrant cette application atteint le pilotage de l'installation."}
              </div>
            </div>
          </div>

          {!cryptoOk ? (
            <div className="form-msg form-err">
              <TriangleAlert size={13} /> Cette page doit être servie en HTTPS pour gérer un mot de
              passe.
            </div>
          ) : (
            <>
              {notice ? (
                <div className="form-msg form-ok">
                  <Check size={13} /> {notice}
                </div>
              ) : null}

              {/* --- Actions --- */}
              {action === null ? (
                <div className="menu-list" style={{ marginTop: 16 }}>
                  <button className="menu-row" type="button" onClick={() => resetForm('change')}>
                    <span className="menu-txt">
                      <span className="menu-label">Changer le mot de passe</span>
                    </span>
                  </button>
                  <button
                    className="menu-row"
                    type="button"
                    onClick={() => resetForm('regenerate')}
                  >
                    <span className="menu-txt">
                      <span className="menu-label">Générer un nouveau code de secours</span>
                      <span className="menu-sub">
                        {hasRecoveryCode(auth)
                          ? 'Le code précédent cessera de fonctionner'
                          : 'Aucun code de secours enregistré'}
                      </span>
                    </span>
                  </button>
                  <button className="menu-row" type="button" onClick={() => resetForm('disable')}>
                    <span className="menu-txt">
                      <span className="menu-label">Retirer la protection</span>
                      <span className="menu-sub">L'application s'ouvrira sans mot de passe</span>
                    </span>
                  </button>
                </div>
              ) : (
                <form className="screen-body" style={{ padding: 0 }} onSubmit={handleSubmit}>
                  {action === 'define' ? (
                    <p className="screen-intro">
                      Choisissez le mot de passe avec l'utilisateur de l'installation. Un code de
                      secours sera généré juste après.
                    </p>
                  ) : null}
                  {action === 'disable' ? (
                    <p className="screen-intro">
                      Confirmez avec le mot de passe actuel. Le code de secours sera effacé lui
                      aussi.
                    </p>
                  ) : null}

                  {defined ? (
                    <>
                      <label className="form-label" htmlFor="sec-current">
                        Mot de passe actuel
                      </label>
                      <div className="form-field">
                        <input
                          id="sec-current"
                          type="password"
                          autoComplete="current-password"
                          value={current}
                          onChange={(e) => {
                            setCurrent(e.target.value)
                            setError(null)
                          }}
                        />
                      </div>
                    </>
                  ) : null}

                  {action === 'define' || action === 'change' ? (
                    <>
                      <label className="form-label" htmlFor="sec-new">
                        Nouveau mot de passe
                      </label>
                      <div className="form-field">
                        <input
                          id="sec-new"
                          type="password"
                          autoComplete="new-password"
                          value={next}
                          onChange={(e) => {
                            setNext(e.target.value)
                            setError(null)
                          }}
                        />
                      </div>
                      <label className="form-label" htmlFor="sec-confirm">
                        Confirmer
                      </label>
                      <div className="form-field">
                        <input
                          id="sec-confirm"
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
                    </>
                  ) : null}

                  {error ? (
                    <div className="form-msg form-err">
                      <TriangleAlert size={13} /> {error}
                    </div>
                  ) : null}

                  <button className="form-submit" type="submit" disabled={busy}>
                    {busy
                      ? 'Patientez…'
                      : action === 'disable'
                        ? 'Retirer la protection'
                        : action === 'regenerate'
                          ? 'Générer le code'
                          : 'Enregistrer'}
                  </button>
                  {defined ? (
                    <button
                      className="form-secondary"
                      type="button"
                      onClick={() => resetForm(null)}
                    >
                      Annuler
                    </button>
                  ) : null}
                </form>
              )}

              {/* --- Delai de reverrouillage --- */}
              {active && action === null ? (
                <>
                  <div className="form-label" style={{ marginTop: 22 }}>
                    Redemander le mot de passe après
                  </div>
                  <div className="segmented" style={{ marginTop: 8 }}>
                    {[0, 5, 15, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={auth.unlockMinutes === m ? 'active' : ''}
                        onClick={() => setDelay(m)}
                      >
                        {m === 0 ? 'Toujours' : `${m} min`}
                      </button>
                    ))}
                  </div>
                  <p className="form-hint">
                    Délai d'inactivité. Tant que l'application est ouverte au premier plan, le mot
                    de passe n'est pas redemandé.
                  </p>
                </>
              ) : null}

              {!defined && action === null ? (
                <button
                  className="form-submit"
                  type="button"
                  onClick={() => resetForm('define')}
                  style={{ marginTop: 18 }}
                >
                  <ShieldOff size={14} /> Définir un mot de passe
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  )
}
