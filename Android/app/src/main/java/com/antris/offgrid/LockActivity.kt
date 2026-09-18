package com.antris.offgrid

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Ecran de deverrouillage — point d'entree de l'application (activite LAUNCHER).
 * Tant que le mot de passe n'a pas ete saisi, MainActivity n'est jamais montree.
 *
 * Garde-fou important : tant qu'aucun mot de passe n'est defini, il n'y a pas de
 * verrou du tout et on passe directement a l'application. Une app fraichement
 * installee ne bloque jamais son nouvel utilisateur.
 */
class LockActivity : AppCompatActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())
    private var countdown: Runnable? = null

    private lateinit var auth: AuthSettings
    private lateinit var input: EditText
    private lateinit var submit: Button
    private lateinit var error: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val settings = SettingsStore.load(this)
        auth = settings.auth

        if (!PasswordGate.isActive(auth) || PasswordGate.isUnlocked(this, auth)) {
            goToApp()
            return
        }

        // Empeche la capture d'ecran / l'apercu dans la liste des taches
        // recentes pendant la saisie du mot de passe.
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        setContentView(R.layout.activity_lock)

        findViewById<TextView>(R.id.siteName).text = settings.site.name
        findViewById<TextView>(R.id.siteTagline).text = settings.site.tagline
        findViewById<TextView>(R.id.lockFooter).text =
            if (auth.unlockMinutes > 0) "Déverrouillage valable ${auth.unlockMinutes} min"
            else "Mot de passe demandé à chaque ouverture"

        input = findViewById(R.id.passwordInput)
        submit = findViewById(R.id.btnUnlock)
        error = findViewById(R.id.lockError)

        submit.setOnClickListener { attempt() }
        input.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                attempt()
                true
            } else {
                false
            }
        }

        val forgot = findViewById<View>(R.id.btnForgot)
        forgot.visibility =
            if (PasswordGate.hasRecoveryCode(auth)) View.VISIBLE else View.GONE
        forgot.setOnClickListener {
            startActivity(Intent(this, RecoveryActivity::class.java))
        }

        refreshLockout()
    }

    private fun attempt() {
        if (PasswordGate.lockoutRemainingMs(this) > 0) {
            refreshLockout()
            return
        }
        val password = input.text.toString()
        if (password.isEmpty()) return

        setBusy(true)
        worker.execute {
            val ok = PasswordGate.verifyPassword(auth, password)
            ui.post {
                if (isFinishing || isDestroyed) return@post
                if (ok) {
                    PasswordGate.resetFailures(this)
                    PasswordGate.markUnlocked(this, auth)
                    goToApp()
                    return@post
                }
                val fails = PasswordGate.registerFailure(this, auth)
                input.setText("")
                setBusy(false)
                if (PasswordGate.lockoutRemainingMs(this) > 0) {
                    refreshLockout()
                } else {
                    showError(
                        if (fails > 1) "Mot de passe incorrect ($fails essais)."
                        else "Mot de passe incorrect.",
                    )
                }
            }
        }
    }

    /** Affiche et met a jour le compte a rebours apres trop d'essais rates. */
    private fun refreshLockout() {
        countdown?.let { ui.removeCallbacks(it) }
        val remaining = PasswordGate.lockoutRemainingMs(this)
        if (remaining <= 0) {
            setBusy(false)
            return
        }
        input.isEnabled = false
        submit.isEnabled = false
        showError("Nouvel essai possible dans ${formatWait(remaining)}")
        val tick = Runnable { refreshLockout() }
        countdown = tick
        ui.postDelayed(tick, 500)
    }

    private fun formatWait(ms: Long): String {
        val total = ((ms + 999) / 1000).toInt()
        val min = total / 60
        val sec = total % 60
        return if (min > 0) "$min min ${sec.toString().padStart(2, '0')} s" else "$sec s"
    }

    private fun setBusy(busy: Boolean) {
        input.isEnabled = !busy
        submit.isEnabled = !busy
        submit.text = if (busy) "Vérification…" else "Déverrouiller"
        if (!busy) error.text = ""
    }

    private fun showError(message: String) {
        error.text = message
    }

    /** Le verrou a pu etre leve ailleurs (recuperation par code de secours). */
    override fun onResume() {
        super.onResume()
        if (::auth.isInitialized && PasswordGate.isUnlocked(this, SettingsStore.load(this).auth)) {
            goToApp()
        }
    }

    private fun goToApp() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        countdown?.let { ui.removeCallbacks(it) }
        worker.shutdownNow()
        super.onDestroy()
    }
}
